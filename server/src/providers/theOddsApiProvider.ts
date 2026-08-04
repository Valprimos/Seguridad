/**
 * providers/theOddsApiProvider.ts
 * ------------------------------------------------------------------
 * Provider REAL conectado a The Odds API (https://the-odds-api.com).
 * Necesita una API key gratuita/de pago suya, configurada SIEMPRE
 * mediante la variable de entorno ODDS_API_KEY (nunca escrita aquí en
 * el código, para no subirla por error a GitHub).
 *
 * ------------------------------------------------------------------
 * PROTECCIÓN DE CRÉDITOS (muy importante)
 * ------------------------------------------------------------------
 * El plan gratuito da 500 créditos/mes. Cada llamada real a la API
 * cuesta (nº de deportes consultados × nº de mercados × nº de
 * regiones) créditos. Si llamáramos a la API cada vez que el frontend
 * refresca (cada 30s), se agotarían los créditos en minutos.
 *
 * Por eso este provider funciona con una CACHÉ EN MEMORIA:
 *   - El frontend sigue pidiendo datos al backend cada 30s (normal).
 *   - Pero este provider solo llama a la API real de verdad cada
 *     ODDS_API_REFRESH_MINUTES minutos (por defecto 1440 = 24h). El
 *     resto de peticiones se responden con la última copia guardada
 *     en memoria.
 *
 * Ejemplo de cálculo con la configuración por defecto (5 deportes,
 * 1 mercado "h2h", región "eu", refresco cada 24h):
 *   coste por actualización = 5 deportes × 1 mercado × 1 región = 5 créditos
 *   actualizaciones al mes  = 30 (una al día)
 *   total al mes            = 150 créditos de 500 → sobra margen de sobra
 *
 * Si añades más mercados (ODDS_API_MARKETS=h2h,spreads,totals) el
 * coste por actualización sube a 5 × 3 × 1 = 15 créditos → 450/mes al
 * refrescar una vez al día. Sigue entrando en el plan gratis, pero ya
 * sin apenas margen: no bajes de 24h si añades varios mercados.
 * ------------------------------------------------------------------
 */

import { MarketEvent, OddQuote, Sport } from '../types';
import { OddsProvider } from './types';

const API_KEY = process.env.ODDS_API_KEY;
const REGIONS = process.env.ODDS_API_REGIONS || 'eu';
const REFRESH_MINUTES = Number(process.env.ODDS_API_REFRESH_MINUTES) || 1440; // 1440 = 24h
const REFRESH_MS = REFRESH_MINUTES * 60 * 1000;

// Claves de deporte de The Odds API que se consultan. Configurable por
// entorno (ODDS_API_SPORTS separado por comas) para poder ajustar el
// gasto de créditos sin tocar código. Por defecto, una selección
// razonable que suele estar activa todo el año.
const DEFAULT_SPORT_KEYS = [
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_uefa_champs_league',
  'basketball_nba',
  'icehockey_nhl',
];

const SPORT_KEYS = process.env.ODDS_API_SPORTS
  ? process.env.ODDS_API_SPORTS.split(',').map((s) => s.trim())
  : DEFAULT_SPORT_KEYS;

// Tipos de mercado a consultar por evento. "h2h" = ganador del partido
// (1X2 en fútbol). "spreads" = hándicap. "totals" = más/menos goles o
// puntos. Cada mercado adicional que añadas aquí SUMA al coste en
// créditos de cada actualización real (coste = nº de mercados × nº de
// deportes × nº de regiones). Ver comentario de costes más abajo.
const DEFAULT_MARKETS = ['h2h'];

const MARKETS = process.env.ODDS_API_MARKETS
  ? process.env.ODDS_API_MARKETS.split(',').map((s) => s.trim())
  : DEFAULT_MARKETS;

const MARKET_LABELS: Record<string, string> = {
  h2h: 'Ganador del partido',
  spreads: 'Hándicap',
  totals: 'Más/Menos',
};

interface RawOutcome {
  name: string;
  price: number;
  /** Presente en "spreads" (hándicap) y "totals" (más/menos) */
  point?: number;
}

interface RawMarket {
  key: string;
  outcomes: RawOutcome[];
}

interface RawBookmaker {
  key: string;
  title: string;
  markets: RawMarket[];
}

interface RawEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: RawBookmaker[];
}

/** Traduce la clave de deporte de The Odds API a nuestro tipo Sport interno */
function mapSportKey(key: string): Sport | null {
  if (key.startsWith('soccer')) return 'futbol';
  if (key.startsWith('tennis')) return 'tenis';
  if (key.startsWith('basketball')) return 'baloncesto';
  if (key.startsWith('icehockey')) return 'hockey';
  if (key.startsWith('esports') || /lol|csgo|dota2|valorant/.test(key)) return 'esports';
  return null;
}

async function fetchSportOdds(sportKey: string): Promise<MarketEvent[]> {
  const url =
    `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/` +
    `?apiKey=${API_KEY}&regions=${REGIONS}&markets=${MARKETS.join(',')}&oddsFormat=decimal`;

  const res = await fetch(url);

  if (!res.ok) {
    // 401 = key inválida, 429 = sin créditos. No tiramos el server, solo avisamos.
    const body = await res.text().catch(() => '');
    throw new Error(`The Odds API (${sportKey}) respondió ${res.status}: ${body.slice(0, 200)}`);
  }

  const remaining = res.headers.get('x-requests-remaining');
  if (remaining) {
    console.log(`[the-odds-api] créditos restantes este mes: ${remaining}`);
  }

  const raw = (await res.json()) as RawEvent[];
  const sport = mapSportKey(sportKey);
  if (!sport) return [];

  const events: MarketEvent[] = [];

  // Un mismo partido genera UN MarketEvent POR CADA TIPO DE MERCADO
  // (h2h, spreads, totals...). No se pueden mezclar en un mismo cálculo
  // de arbitraje porque son apuestas distintas (ganador vs hándicap vs
  // más/menos), cada una con sus propias cuotas y resultados posibles.
  for (const marketKey of MARKETS) {
    for (const event of raw) {
      const quotes: OddQuote[] = [];

      for (const bookmaker of event.bookmakers) {
        const market = bookmaker.markets.find((m) => m.key === marketKey);
        if (!market) continue;

        for (const outcome of market.outcomes) {
          // Para spreads/totals, el "point" (línea de hándicap o de
          // más/menos) forma parte del resultado: una cuota de "Más 2.5"
          // NO es el mismo resultado que "Más 3.5". Si no las separamos,
          // se compararían cuotas de líneas distintas como si fueran
          // arbitraje real, y no lo serían.
          const hasPoint = typeof outcome.point === 'number';
          const outcomeId = hasPoint ? `${outcome.name}@${outcome.point}` : outcome.name;
          const outcomeLabel = hasPoint ? `${outcome.name} ${outcome.point! > 0 ? '+' : ''}${outcome.point}` : outcome.name;

          quotes.push({
            outcomeId,
            outcomeLabel,
            bookmaker: bookmaker.title,
            odds: outcome.price,
          });
        }
      }

      if (quotes.length === 0) continue;

      const uniqueOutcomes = new Set(quotes.map((q) => q.outcomeId)).size;
      const marketLabel =
        marketKey === 'h2h'
          ? uniqueOutcomes > 2
            ? '1X2'
            : 'Ganador del partido'
          : MARKET_LABELS[marketKey] || marketKey;

      events.push({
        id: `odds-api-${event.id}-${marketKey}`,
        sport,
        competition: event.sport_title,
        eventName: `${event.home_team} vs ${event.away_team}`,
        startTime: event.commence_time,
        market: marketLabel,
        quotes,
        isDemo: false,
        source: 'the-odds-api',
      });
    }
  }

  return events;
}

let cache: MarketEvent[] = [];
let lastFetchAt = 0;
let fetchInFlight: Promise<void> | null = null;

async function refreshCache(): Promise<void> {
  const results = await Promise.allSettled(SPORT_KEYS.map(fetchSportOdds));

  const events: MarketEvent[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      events.push(...r.value);
    } else {
      console.error(`[the-odds-api] error consultando "${SPORT_KEYS[i]}":`, r.reason?.message ?? r.reason);
    }
  });

  // Solo sobrescribimos la caché si obtuvimos algo, para no dejar el
  // dashboard vacío por un fallo puntual de la API.
  if (events.length > 0 || results.every((r) => r.status === 'fulfilled')) {
    cache = events;
  }
  lastFetchAt = Date.now();
}

export const theOddsApiProvider: OddsProvider = {
  name: 'the-odds-api',
  isDemo: false,

  async fetchOdds(): Promise<MarketEvent[]> {
    if (!API_KEY) {
      throw new Error('Falta la variable de entorno ODDS_API_KEY');
    }

    const isStale = Date.now() - lastFetchAt > REFRESH_MS;

    if (isStale && !fetchInFlight) {
      // Evita disparar varias llamadas reales a la vez si llegan varias
      // peticiones del frontend justo cuando la caché ha caducado.
      fetchInFlight = refreshCache().finally(() => {
        fetchInFlight = null;
      });
    }

    if (cache.length === 0 && fetchInFlight) {
      // Primera carga: esperamos a tener algo que devolver.
      await fetchInFlight;
    }

    return cache;
  },
};
