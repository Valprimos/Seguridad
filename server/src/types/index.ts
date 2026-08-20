/**
 * types/index.ts
 * Tipos de dominio compartidos por todo el backend.
 */

export type Sport = 'futbol' | 'tenis' | 'baloncesto' | 'hockey' | 'esports';

export const SPORTS: Sport[] = ['futbol', 'tenis', 'baloncesto', 'hockey', 'esports'];

/** Una cuota individual ofrecida por una casa para un resultado concreto */
export interface OddQuote {
  outcomeId: string; // "1", "X", "2", "Jugador A", etc.
  outcomeLabel: string;
  bookmaker: string;
  odds: number;
  commission?: number;
}

/** Un evento deportivo con sus cuotas, tal y como lo entrega un provider */
export interface MarketEvent {
  id: string;
  sport: Sport;
  competition: string;
  eventName: string; // ej: "Real Madrid vs Barcelona"
  startTime: string; // ISO date
  market: string; // ej: "1X2", "Ganador del partido"
  quotes: OddQuote[];
  /** Marca explícita de que el dato es simulado/demo */
  isDemo: boolean;
  /** Proveedor/origen del dato */
  source: string;
}

/** Surebet detectada y persistible, lista para mostrar en UI o guardar en historial */
export interface SurebetRecord {
  id: string;
  sport: Sport;
  competition: string;
  eventName: string;
  market: string;
  startTime: string;
  detectedAt: string;
  profitPercent: number;
  roi: number;
  guaranteedProfit: number;
  totalStake: number;
  bankrollUsed: number;
  bookmakers: string[]; // lista de casas implicadas
  outcomes: {
    outcomeId: string;
    outcomeLabel: string;
    bookmaker: string;
    odds: number;
    stake: number;
    payout: number;
  }[];
  isDemo: boolean;
  source: string;
}

export interface AppSettings {
  defaultBankroll: number;
  currency: string; // "EUR", "USD", ...
  language: string; // "es", "en", ...
  theme: 'dark' | 'light';
  minProfitAlert: number; // % mínimo para disparar alerta
  soundAlertsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  discreetModeEnabled: boolean;
  discreetRoundingUnit: number;
  /** Casas de apuestas VETADAS: se excluyen de surebets, cuotas de valor y del listado de "mejor cuota" */
  blockedBookmakers: string[];
  /** Activa/desactiva el cálculo de cuotas de alto valor (value betting) */
  valueBetsEnabled: boolean;
  /** EV% mínimo para considerar una cuota "de alto valor" */
  minEvPercent: number;
  /** Fracción de Kelly aplicada al stake sugerido (1 = Kelly completo, 0.25 = Kelly ¼) */
  kellyFraction: number;
  /** URL de webhook (ntfy.sh, Discord, Slack...) para alertas fuera de la app */
  webhookUrl: string;
  webhookAlertsEnabled: boolean;
}

/** Cuota de alto valor: una cuota individual cuyo precio supera la probabilidad "justa"
 * estimada a partir del consenso (des-margenado) de todas las casas que cubren el mismo evento. */
export interface ValueBetRecord {
  id: string;
  /** ID del evento del que procede (para poder consultar GET /api/odds/:eventId y comparar con otras casas) */
  eventId: string;
  sport: Sport;
  competition: string;
  eventName: string;
  market: string;
  startTime: string;
  detectedAt: string;
  outcomeId: string;
  outcomeLabel: string;
  bookmaker: string;
  odds: number;
  /** Cuota "justa" estimada por consenso del mercado (des-margenada) */
  fairOdds: number;
  fairProbability: number;
  /** Valor esperado, en % sobre el stake (positivo = apuesta de valor) */
  evPercent: number;
  /** Nº de casas usadas para estimar la cuota justa (más casas = estimación más fiable) */
  booksUsed: number;
  /** Stake sugerido (Kelly fraccionado) para esta cuota, en unidades monetarias */
  suggestedStake: number;
  bankrollUsed: number;
  isDemo: boolean;
  source: string;
}

/** Resultado REAL de un evento, introducido a mano (no hay proveedor de
 * resultados conectado). Un único resultado por evento, compartido entre
 * surebets y cuotas de valor: ambas se liquidan contra este mismo dato. */
export interface EventResult {
  eventId: string;
  eventName: string;
  winningOutcomeId: string;
  winningOutcomeLabel: string;
  recordedAt: string;
}

/** Evento estudiado (con surebet y/o cuota de valor detectada) que aún no
 * tiene un resultado registrado, con sus posibles resultados para poder
 * elegir cuál ganó desde el formulario de registro manual. */
export interface PendingResultEvent {
  eventId: string;
  eventName: string;
  competition: string;
  sport: Sport;
  market: string;
  startTime: string;
  outcomes: { id: string; label: string }[];
}

/** SurebetRecord con la información de liquidación ya calculada (para /history) */
export interface SettledSurebetRecord extends SurebetRecord {
  settled: boolean;
  resultOutcomeLabel: string | null;
  /** Beneficio real: si está liquidada, siempre = guaranteedProfit (una surebet
   * gana lo mismo gane quien gane, por eso es "garantizado"); null si está pendiente. */
  actualProfit: number | null;
}

/** ValueBetRecord con la información de liquidación ya calculada (para /history).
 * A diferencia de una surebet, una cuota de valor SÍ depende del resultado real:
 * se gana (suggestedStake × (odds − 1)) si acierta, o se pierde (−suggestedStake) si no. */
export interface SettledValueBetRecord extends ValueBetRecord {
  settled: boolean;
  resultOutcomeLabel: string | null;
  won: boolean | null;
  actualProfit: number | null;
}

export interface ResultsSummary {
  /** Beneficio/pérdida neto acumulado de todo lo liquidado (surebets + cuotas de valor) */
  netBalance: number;
  settledSurebets: number;
  settledValueBets: number;
  valueBetsWon: number;
  valueBetsLost: number;
  pendingEvents: number;
}
