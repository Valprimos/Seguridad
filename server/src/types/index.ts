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
}
