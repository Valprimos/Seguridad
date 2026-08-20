export type Sport = 'futbol' | 'tenis' | 'baloncesto' | 'hockey' | 'esports';

export const SPORT_LABELS: Record<Sport, string> = {
  futbol: 'Fútbol',
  tenis: 'Tenis',
  baloncesto: 'Baloncesto',
  hockey: 'Hockey',
  esports: 'Esports',
};

export interface SurebetOutcome {
  outcomeId: string;
  outcomeLabel: string;
  bookmaker: string;
  odds: number;
  stake: number;
  payout: number;
}

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
  bookmakers: string[];
  outcomes: SurebetOutcome[];
  isDemo: boolean;
  source: string;
}

export interface Stats {
  totalSurebets: number;
  averageProfitPercent: number;
  bestOpportunity: SurebetRecord | null;
  potentialDailyProfit: number;
  bySport: { sport: Sport; count: number }[];
}

export interface AppSettings {
  defaultBankroll: number;
  currency: string;
  language: string;
  theme: 'dark' | 'light';
  minProfitAlert: number;
  soundAlertsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  /** "Modo discreto": redondea los importes a apostar para que no se
   * vean como un cálculo exacto de arbitraje (menos detectable), a
   * costa de un beneficio garantizado ligeramente menor/variable. */
  discreetModeEnabled: boolean;
  /** Unidad de redondeo de los importes en modo discreto (ej: 5 = redondea a múltiplos de 5) */
  discreetRoundingUnit: number;
  /** Casas de apuestas VETADAS: excluidas de surebets y cuotas de valor */
  blockedBookmakers: string[];
  valueBetsEnabled: boolean;
  minEvPercent: number;
  kellyFraction: number;
  webhookUrl: string;
  webhookAlertsEnabled: boolean;
}

export type SortBy = 'detectedAt' | 'startTime' | 'profit';

export interface SurebetFilters {
  sport: Sport | 'todos';
  bookmaker: string | 'todas';
  minProfit: number;
  search: string;
  sortBy: SortBy;
}

/** Cuota individual que paga por encima de la probabilidad de consenso del mercado */
export interface ValueBetRecord {
  id: string;
  /** ID del evento del que procede (para consultar GET /api/odds/:eventId) */
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
  fairOdds: number;
  fairProbability: number;
  evPercent: number;
  booksUsed: number;
  suggestedStake: number;
  bankrollUsed: number;
  isDemo: boolean;
  source: string;
}

export type ValueBetSortBy = 'ev' | 'startTime' | 'detectedAt';

export interface ValueBetFilters {
  sport: Sport | 'todos';
  bookmaker: string | 'todas';
  minEv: number;
  search: string;
  sortBy: ValueBetSortBy;
}

/** Cuota completa de un evento (TODAS las casas, incluidas las vetadas) para
 * el desplegable "ver otras cuotas" del Dashboard y de Cuotas de valor. */
export interface EventOddsQuote {
  outcomeId: string;
  outcomeLabel: string;
  bookmaker: string;
  odds: number;
  /** true si esa casa está vetada en Configuración (excluida de los cálculos automáticos) */
  blocked: boolean;
}

export interface EventOdds {
  id: string;
  sport: Sport;
  competition: string;
  eventName: string;
  market: string;
  startTime: string;
  quotes: EventOddsQuote[];
  isDemo: boolean;
  source: string;
}

/** Resultado REAL de un evento, introducido a mano en "Resultados". */
export interface EventResult {
  eventId: string;
  eventName: string;
  winningOutcomeId: string;
  winningOutcomeLabel: string;
  recordedAt: string;
}

/** Evento estudiado (con surebet y/o cuota de valor guardada) sin resultado aún. */
export interface PendingResultEvent {
  eventId: string;
  eventName: string;
  competition: string;
  sport: Sport;
  market: string;
  startTime: string;
  outcomes: { id: string; label: string }[];
}

/** SurebetRecord con la liquidación ya calculada (respuesta de /surebets/history) */
export interface SettledSurebetRecord extends SurebetRecord {
  settled: boolean;
  resultOutcomeLabel: string | null;
  actualProfit: number | null;
}

/** ValueBetRecord con la liquidación ya calculada (respuesta de /valuebets/history) */
export interface SettledValueBetRecord extends ValueBetRecord {
  settled: boolean;
  resultOutcomeLabel: string | null;
  won: boolean | null;
  actualProfit: number | null;
}

export interface ResultsSummary {
  netBalance: number;
  settledSurebets: number;
  settledValueBets: number;
  valueBetsWon: number;
  valueBetsLost: number;
  pendingEvents: number;
}
