/**
 * services/api.ts
 * Cliente HTTP centralizado para hablar con el backend Express.
 * Vite hace proxy de /api hacia http://localhost:4000 (ver vite.config.ts).
 */

import {
  AppSettings,
  Sport,
  Stats,
  SurebetRecord,
} from '../types';
import { OutcomeInput, ArbitrageResult } from '../math/arbitrage';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Error ${res.status} en ${path}`);
  }
  return res.json();
}

export const api = {
  getSports(): Promise<{ data: Sport[] }> {
    return request('/sports');
  },

  getLiveSurebets(bankroll: number): Promise<{ data: SurebetRecord[]; generatedAt: string }> {
    return request(`/surebets/live?bankroll=${bankroll}`);
  },

  getHistory(params: {
    sport?: string;
    bookmaker?: string;
    minProfit?: number;
    search?: string;
  }): Promise<{ data: SurebetRecord[] }> {
    const query = new URLSearchParams();
    if (params.sport && params.sport !== 'todos') query.set('sport', params.sport);
    if (params.bookmaker && params.bookmaker !== 'todas') query.set('bookmaker', params.bookmaker);
    if (params.minProfit) query.set('minProfit', String(params.minProfit));
    if (params.search) query.set('search', params.search);
    return request(`/surebets/history?${query.toString()}`);
  },

  getStats(): Promise<Stats> {
    return request('/surebets/stats');
  },

  calculate(bankroll: number, outcomes: OutcomeInput[]): Promise<ArbitrageResult> {
    return request('/surebets/calculate', {
      method: 'POST',
      body: JSON.stringify({ bankroll, outcomes }),
    });
  },

  getSettings(): Promise<AppSettings> {
    return request('/settings');
  },

  updateSettings(settings: AppSettings): Promise<AppSettings> {
    return request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};
