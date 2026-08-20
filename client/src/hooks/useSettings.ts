import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  defaultBankroll: 1000,
  currency: 'EUR',
  language: 'es',
  theme: 'dark',
  minProfitAlert: 1.5,
  soundAlertsEnabled: true,
  browserNotificationsEnabled: true,
  discreetModeEnabled: false,
  discreetRoundingUnit: 5,
  blockedBookmakers: [],
  valueBetsEnabled: true,
  minEvPercent: 1,
  kellyFraction: 0.25,
  webhookUrl: '',
  webhookAlertsEnabled: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((res) => setSettings({ ...DEFAULT_SETTINGS, ...res }))
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => setLoaded(true));
  }, []);

  const save = useCallback(async (next: AppSettings) => {
    setSettings(next); // optimista
    await api.updateSettings(next);
  }, []);

  return { settings, loaded, save };
}
