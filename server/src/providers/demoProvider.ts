/**
 * providers/demoProvider.ts
 * ------------------------------------------------------------------
 * Proveedor de datos DEMO. Genera eventos y cuotas SIMULADAS para
 * poder probar toda la aplicación sin depender de ninguna API real.
 *
 * ⚠️ Las CUOTAS son simuladas (aleatorias). Para que la app se sienta
 * "real" desde ya, las cuotas simuladas se reparten entre nombres de
 * casas de apuestas reales del mercado — pero siguen sin ser precios
 * reales ni provenir de ninguna API/scraper de esas casas. Por eso
 * todos los eventos se marcan con `isDemo: true` y `source: "demo"`,
 * y la UI muestra siempre el aviso correspondiente.
 *
 * Para obtener cuotas REALES de estas casas necesitas conectar su
 * API oficial (si la ofrecen) o un scraper propio respetando sus
 * términos de servicio. Crea un archivo hermano (ver
 * `providers/types.ts`) que implemente `OddsProvider` y regístralo
 * en `providers/index.ts`. No hace falta tocar este archivo.
 * ------------------------------------------------------------------
 */

import { MarketEvent, Sport } from '../types';
import { OddsProvider } from './types';

// Nombres reales de casas de apuestas del mercado (solo como etiqueta;
// las cuotas asociadas siguen siendo simuladas — ver cabecera del archivo).
const DEMO_BOOKMAKERS = [
  'Bet365',
  'Bwin',
  'William Hill',
  'Betfair',
  'Pinnacle',
  '1xBet',
  'Betway',
  'Unibet',
  'Marathonbet',
  '888sport',
  'Codere',
  'Sportium',
  'Betsson',
  'LeoVegas',
  'Interwetten',
];

interface EventTemplate {
  sport: Sport;
  competition: string;
  eventName: string;
  market: string;
  outcomes: { id: string; label: string }[];
}

// Plantillas de eventos DEMO por deporte (nombres genéricos, no reales)
const TEMPLATES: EventTemplate[] = [
  {
    sport: 'futbol',
    competition: 'Liga Demo A',
    eventName: 'Equipo Rojo vs Equipo Azul',
    market: '1X2',
    outcomes: [
      { id: '1', label: 'Local' },
      { id: 'X', label: 'Empate' },
      { id: '2', label: 'Visitante' },
    ],
  },
  {
    sport: 'futbol',
    competition: 'Liga Demo B',
    eventName: 'Club Norte vs Club Sur',
    market: '1X2',
    outcomes: [
      { id: '1', label: 'Local' },
      { id: 'X', label: 'Empate' },
      { id: '2', label: 'Visitante' },
    ],
  },
  {
    sport: 'tenis',
    competition: 'ATP Demo Open',
    eventName: 'Jugador A vs Jugador B',
    market: 'Ganador del partido',
    outcomes: [
      { id: '1', label: 'Jugador A' },
      { id: '2', label: 'Jugador B' },
    ],
  },
  {
    sport: 'baloncesto',
    competition: 'Liga Demo Basket',
    eventName: 'Halcones vs Tiburones',
    market: 'Ganador del partido',
    outcomes: [
      { id: '1', label: 'Halcones' },
      { id: '2', label: 'Tiburones' },
    ],
  },
  {
    sport: 'hockey',
    competition: 'Liga Demo Hielo',
    eventName: 'Osos vs Lobos',
    market: 'Ganador (tiempo regl. + prórroga)',
    outcomes: [
      { id: '1', label: 'Osos' },
      { id: '2', label: 'Lobos' },
    ],
  },
  {
    sport: 'esports',
    competition: 'Demo Esports Series',
    eventName: 'Equipo Fenix vs Equipo Dragon',
    market: 'Ganador del mapa',
    outcomes: [
      { id: '1', label: 'Equipo Fenix' },
      { id: '2', label: 'Equipo Dragon' },
    ],
  },
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickBookmakers(count: number): string[] {
  const shuffled = [...DEMO_BOOKMAKERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Genera cuotas para un conjunto de resultados, ofrecidas por VARIAS
 * casas distintas (entre 4 y 7 de las 15 disponibles, elegidas al azar
 * por evento). Cada casa aplica su propio margen individual, así que
 * la mejor cuota de cada resultado normalmente proviene de una casa
 * diferente — igual que en un mercado real. El detector (`surebetDetector.ts`)
 * combina la mejor cuota de cada resultado entre todas las casas: cuando
 * esa combinación suma menos del 100% de probabilidad implícita, hay
 * arbitraje.
 */
function generateQuotes(outcomes: { id: string; label: string }[]) {
  // Probabilidad "real" base de cada resultado (suman 1)
  const rawProbs = outcomes.map(() => Math.random() + 0.5);
  const total = rawProbs.reduce((a, b) => a + b, 0);
  const probs = rawProbs.map((p) => p / total);
  const fairOdds = probs.map((p) => 1 / p);

  const bookCount = Math.round(randomBetween(4, 7));
  const bookmakers = pickBookmakers(bookCount);

  const quotes: {
    outcomeId: string;
    outcomeLabel: string;
    bookmaker: string;
    odds: number;
  }[] = [];

  for (const bookmaker of bookmakers) {
    // Cada casa tiene su propio margen (vig) sobre el mercado: entre
    // -1% (agresiva, favorece el arbitraje) y 6% (margen típico).
    const bookMargin = randomBetween(-0.01, 0.06);

    outcomes.forEach((outcome, i) => {
      // Pequeño ruido por resultado para que no todas las cuotas de una
      // misma casa se muevan de forma perfectamente uniforme.
      const noise = randomBetween(-0.015, 0.015);
      const marketOdds = fairOdds[i] * (1 - bookMargin / outcomes.length + noise);
      quotes.push({
        outcomeId: outcome.id,
        outcomeLabel: outcome.label,
        bookmaker,
        odds: Math.max(1.01, Math.round(marketOdds * 100) / 100),
      });
    });
  }

  return quotes;
}

export const demoProvider: OddsProvider = {
  name: 'demo',
  isDemo: true,

  async fetchOdds(): Promise<MarketEvent[]> {
    const now = Date.now();

    return TEMPLATES.map((tpl, idx) => {
      const quotes = generateQuotes(tpl.outcomes);
      return {
        // ID ESTABLE: depende solo de la posición de la plantilla, NO
        // de la hora actual. Si incluyéramos un timestamp aquí, cada
        // refresco de 30s generaría un "partido" con id distinto, y el
        // historial se llenaría de partidos duplicados sin fin.
        id: `demo-${idx}`,
        sport: tpl.sport,
        competition: tpl.competition,
        eventName: tpl.eventName,
        // Hora de inicio determinista (no aleatoria en cada refresco),
        // repartida a lo largo de las próximas horas según la posición
        // de la plantilla, para poder probar el orden por fecha sin que
        // la hora "baile" en cada actualización.
        startTime: new Date(now + (idx + 1) * 4 * 3600 * 1000).toISOString(),
        market: tpl.market,
        quotes,
        isDemo: true,
        source: 'demo',
      } as MarketEvent;
    });
  },
};
