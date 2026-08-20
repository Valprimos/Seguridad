import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { ValueBetRecord } from '../types';
import { useAutoRefresh } from './useAutoRefresh';

const REFRESH_INTERVAL_MS = 30_000;

export function useValueBets(bankroll: number, minEv: number | undefined, enabled: boolean) {
  const [valueBets, setValueBets] = useState<ValueBetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, generatedAt } = await api.getLiveValueBets(bankroll, minEv);
      setValueBets(data);
      setLastUpdated(generatedAt);
    } catch (err: any) {
      setError(err.message ?? 'Error al obtener cuotas de valor');
    } finally {
      setLoading(false);
    }
  }, [bankroll, minEv]);

  useAutoRefresh(refresh, REFRESH_INTERVAL_MS, enabled);

  return { valueBets, loading, error, lastUpdated, refresh };
}
