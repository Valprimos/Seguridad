import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';
import { SurebetRecord } from '../types';
import { useAutoRefresh } from './useAutoRefresh';
import { AppSettings } from '../types';

const REFRESH_INTERVAL_MS = 30_000;

/**
 * Sonido de alerta simple generado con la Web Audio API (sin ficheros
 * externos que descargar). Se usa cuando aparece una nueva surebet
 * que supera el beneficio mínimo configurado.
 */
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch {
    // Entorno sin soporte de audio: ignorar silenciosamente
  }
}

function notifyBrowser(surebet: SurebetRecord) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  new Notification('¡Nueva surebet detectada!', {
    body: `${surebet.eventName} — beneficio ${surebet.profitPercent.toFixed(2)}%`,
  });
}

export function useSurebets(bankroll: number, settings: AppSettings | null) {
  const [surebets, setSurebets] = useState<SurebetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, generatedAt } = await api.getLiveSurebets(bankroll);

      // Detectar surebets NUEVAS que superen el umbral de alerta configurado
      const minProfit = settings?.minProfitAlert ?? 0;
      const newOnes = data.filter(
        (s) => !knownIds.current.has(s.id) && s.profitPercent >= minProfit
      );

      if (newOnes.length > 0 && knownIds.current.size > 0) {
        if (settings?.soundAlertsEnabled) playBeep();
        if (settings?.browserNotificationsEnabled) newOnes.forEach(notifyBrowser);
      }
      data.forEach((s) => knownIds.current.add(s.id));

      setSurebets(data);
      setLastUpdated(generatedAt);
    } catch (err: any) {
      setError(err.message ?? 'Error al obtener surebets');
    } finally {
      setLoading(false);
    }
  }, [bankroll, settings]);

  useAutoRefresh(refresh, REFRESH_INTERVAL_MS, true);

  return { surebets, loading, error, lastUpdated, refresh };
}
