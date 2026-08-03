/**
 * routes/settings.ts
 * GET  /api/settings  -> devuelve la configuración actual
 * PUT  /api/settings  -> actualiza la configuración
 */

import { Router } from 'express';
import { db } from '../db/db';
import { AppSettings } from '../types';

export const settingsRouter = Router();

function rowToSettings(row: any): AppSettings {
  return {
    defaultBankroll: row.default_bankroll,
    currency: row.currency,
    language: row.language,
    theme: row.theme,
    minProfitAlert: row.min_profit_alert,
    soundAlertsEnabled: !!row.sound_alerts_enabled,
    browserNotificationsEnabled: !!row.browser_notifications_enabled,
  };
}

settingsRouter.get('/', (_req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(rowToSettings(row));
});

settingsRouter.put('/', (req, res) => {
  const s = req.body as AppSettings;
  db.prepare(
    `UPDATE settings SET
      default_bankroll = @defaultBankroll,
      currency = @currency,
      language = @language,
      theme = @theme,
      min_profit_alert = @minProfitAlert,
      sound_alerts_enabled = @soundAlertsEnabled,
      browser_notifications_enabled = @browserNotificationsEnabled
     WHERE id = 1`
  ).run({
    ...s,
    soundAlertsEnabled: s.soundAlertsEnabled ? 1 : 0,
    browserNotificationsEnabled: s.browserNotificationsEnabled ? 1 : 0,
  });

  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(rowToSettings(row));
});
