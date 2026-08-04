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
 * cuesta (nº de mercados × nº de regiones) créditos. Si llamáramos a
 * la API cada vez que el frontend refresca (cada 30s), se agotarían
 * los créditos en minutos.
 *
 * Por eso este provider funciona con una CACHÉ EN MEMORIA:
 *   - El frontend sigue pidiendo datos al backend cada 30s (normal).
 *   - Pero este provider solo llama a la API real de verdad cada
 *     ODDS_API_REFRESH_MINUTES minutos (por defecto 20). El resto de
 *     peticiones se responden con la última copia guardada en memoria.
 * ------------------------------------------------------------------
 */

import { MarketEvent, OddQuote, Sport } from '../types';
import { OddsProvider } from './types';

const API_KEY = process.env.ODDS_API_KEY;
const REGIONS = process.env.ODDS_API_REGIONS || 'eu';
const REFRESH_MINUTES = Number(process.env.ODDS_API_REFRESH_MINUTES) || 20;
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

interface RawOutcome {
  name: string;
  price: number;
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
    `?apiKey=${API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=decimal`;

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

  return raw.map((event) => {
    const quotes: OddQuote[] = [];

    for (const bookmaker of event.bookmakers) {
      const h2h = bookmaker.markets.find((m) => m.key === 'h2h');
      if (!h2h) continue;
      for (const outcome of h2h.outcomes) {
        quotes.push({
          outcomeId: outcome.name,
          outcomeLabel: outcome.name,
          bookmaker: bookmaker.title,
          odds: outcome.price,
        });
      }
    }

    const uniqueOutcomes = new Set(quotes.map((q) => q.outcomeId)).size;

    return {
      id: `odds-api-${event.id}`,
      sport,
      competition: event.sport_title,
      eventName: `${event.home_team} vs ${event.away_team}`,
      startTime: event.commence_time,
      market: uniqueOutcomes > 2 ? '1X2' : 'Ganador del partido',
      quotes,
      isDemo: false,
      source: 'the-odds-api',
    } as MarketEvent;
  });
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
