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
}

export interface SurebetFilters {
  sport: Sport | 'todos';
  bookmaker: string | 'todas';
  minProfit: number;
  search: string;
}
