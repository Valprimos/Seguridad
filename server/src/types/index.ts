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
