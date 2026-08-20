/**
 * routes/settings.ts
 * GET  /api/settings            -> devuelve la configuración actual
 * PUT  /api/settings             -> actualiza la configuración
 * POST /api/settings/test-webhook -> envía una notificación de prueba al webhook indicado
 */

import { Router } from 'express';
import { db } from '../db/db';
import { AppSettings } from '../types';
import { sendTestWebhook } from '../services/webhookNotifier';

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
    discreetModeEnabled: !!row.discreet_mode_enabled,
    discreetRoundingUnit: row.discreet_rounding_unit,
    blockedBookmakers: JSON.parse(row.blocked_bookmakers || '[]'),
    valueBetsEnabled: !!row.value_bets_enabled,
    minEvPercent: row.min_ev_percent,
    kellyFraction: row.kelly_fraction,
    webhookUrl: row.webhook_url || '',
    webhookAlertsEnabled: !!row.webhook_alerts_enabled,
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
      browser_notifications_enabled = @browserNotificationsEnabled,
      discreet_mode_enabled = @discreetModeEnabled,
      discreet_rounding_unit = @discreetRoundingUnit,
      blocked_bookmakers = @blockedBookmakers,
      value_bets_enabled = @valueBetsEnabled,
      min_ev_percent = @minEvPercent,
      kelly_fraction = @kellyFraction,
      webhook_url = @webhookUrl,
      webhook_alerts_enabled = @webhookAlertsEnabled
     WHERE id = 1`
  ).run({
    ...s,
    soundAlertsEnabled: s.soundAlertsEnabled ? 1 : 0,
    browserNotificationsEnabled: s.browserNotificationsEnabled ? 1 : 0,
    discreetModeEnabled: s.discreetModeEnabled ? 1 : 0,
    discreetRoundingUnit: s.discreetRoundingUnit ?? 5,
    blockedBookmakers: JSON.stringify(s.blockedBookmakers ?? []),
    valueBetsEnabled: s.valueBetsEnabled ? 1 : 0,
    minEvPercent: s.minEvPercent ?? 2,
    kellyFraction: s.kellyFraction ?? 0.25,
    webhookUrl: s.webhookUrl ?? '',
    webhookAlertsEnabled: s.webhookAlertsEnabled ? 1 : 0,
  });

  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(rowToSettings(row));
});

settingsRouter.post('/test-webhook', async (req, res) => {
  const { webhookUrl } = req.body as { webhookUrl?: string };
  if (!webhookUrl) {
    return res.status(400).json({ error: 'Falta webhookUrl' });
  }
  try {
    await sendTestWebhook(webhookUrl);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? 'Error enviando la prueba' });
  }
});
