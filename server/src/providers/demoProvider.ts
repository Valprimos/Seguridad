/**
 * providers/demoProvider.ts
 * ------------------------------------------------------------------
 * Proveedor de datos DEMO. Genera eventos y cuotas SIMULADAS para
 * poder probar toda la aplicación sin depender de ninguna API real.
 *
 * ⚠️ NINGÚN dato aquí proviene de una casa de apuestas real.
 * Todos los eventos se marcan con `isDemo: true` y `source: "demo"`,
 * y la UI debe mostrar siempre este aviso al usuario.
 *
 * Para conectar una fuente real, crea un archivo hermano (ver
 * `providers/types.ts`) que implemente `OddsProvider` y regístralo
 * en `providers/index.ts`. No hace falta tocar este archivo.
 * ------------------------------------------------------------------
 */

import { MarketEvent, Sport } from '../types';
import { OddsProvider } from './types';

const DEMO_BOOKMAKERS = [
  'BetDemo A',
  'BetDemo B',
  'BetDemo C',
  'BetDemo D',
  'BetDemo E',
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
 * Genera cuotas para un conjunto de resultados. Con una probabilidad
 * (ARBITRAGE_CHANCE) fuerza artificialmente que exista arbitraje,
 * repartiendo la mejor cuota de cada resultado entre casas distintas,
 * para que el detector tenga surebets DEMO que mostrar.
 */
function generateQuotes(outcomes: { id: string; label: string }[]) {
  const n = outcomes.length;
  const forceArbitrage = Math.random() < 0.35;

  // Probabilidad "real" base de cada resultado (suman 1)
  const rawProbs = outcomes.map(() => Math.random() + 0.5);
  const total = rawProbs.reduce((a, b) => a + b, 0);
  const probs = rawProbs.map((p) => p / total);

  // Margen de la casa individual (round normal): entre 3% y 7%
  const bookMargin = forceArbitrage ? randomBetween(-0.02, 0.01) : randomBetween(0.03, 0.07);

  return outcomes.map((outcome, i) => {
    const fairOdds = 1 / probs[i];
    // Cuota "de mercado" con el margen de la casa aplicado de forma proporcional
    const marketOdds = fairOdds * (1 - bookMargin / n);
    const bookmaker = pickBookmakers(1)[0];
    return {
      outcomeId: outcome.id,
      outcomeLabel: outcome.label,
      bookmaker,
      odds: Math.max(1.01, Math.round(marketOdds * 100) / 100),
    };
  });
}

export const demoProvider: OddsProvider = {
  name: 'demo',
  isDemo: true,

  async fetchOdds(): Promise<MarketEvent[]> {
    const now = Date.now();

    return TEMPLATES.map((tpl, idx) => {
      const quotes = generateQuotes(tpl.outcomes);
      return {
        id: `demo-${idx}-${now}`,
        sport: tpl.sport,
        competition: tpl.competition,
        eventName: tpl.eventName,
        startTime: new Date(now + randomBetween(1, 48) * 3600 * 1000).toISOString(),
        market: tpl.market,
        quotes,
        isDemo: true,
        source: 'demo',
      } as MarketEvent;
    });
  },
};
