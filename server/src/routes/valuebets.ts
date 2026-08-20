/**
 * routes/valuebets.ts
 * ------------------------------------------------------------------
 * GET /api/valuebets/live -> calcula AHORA MISMO las cuotas de alto
 * valor (value bets): cuotas individuales cuyo precio supera la
 * probabilidad de consenso del mercado. A diferencia de las surebets,
 * no se persisten en base de datos (son una foto del momento, igual
 * que la app original mostraba en el Dashboard antes de guardar en
 * historial) — ver `services/valueBetDetector.ts`.
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { db } from '../db/db';
import { getAllOdds } from '../providers';
import { detectValueBets } from '../services/valueBetDetector';
import { filterBlockedBookmakers } from '../utils/bookmakers';
import { notifyNewOpportunities } from '../services/webhookNotifier';

export const valueBetsRouter = Router();

interface LiveSettings {
  bankroll: number;
  currency: string;
  blockedBookmakers: string[];
  valueBetsEnabled: boolean;
  minEvPercent: number;
  kellyFraction: number;
  webhookUrl: string;
  webhookAlertsEnabled: boolean;
}

function getLiveSettings(): LiveSettings {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
  return {
    bankroll: row?.default_bankroll ?? 1000,
    currency: row?.currency ?? 'EUR',
    blockedBookmakers: JSON.parse(row?.blocked_bookmakers || '[]'),
    valueBetsEnabled: row?.value_bets_enabled === undefined ? true : !!row.value_bets_enabled,
    minEvPercent: row?.min_ev_percent ?? 1,
    kellyFraction: row?.kelly_fraction ?? 0.25,
    webhookUrl: row?.webhook_url || '',
    webhookAlertsEnabled: !!row?.webhook_alerts_enabled,
  };
}

// GET /api/valuebets/live?bankroll=1000&minEv=2
valueBetsRouter.get('/live', async (req, res) => {
  try {
    const settings = getLiveSettings();

    if (!settings.valueBetsEnabled) {
      return res.json({ data: [], generatedAt: new Date().toISOString(), disabled: true });
    }

    const bankroll = Number(req.query.bankroll) || settings.bankroll;
    const minEvPercent = req.query.minEv !== undefined ? Number(req.query.minEv) : settings.minEvPercent;

    const events = await getAllOdds();
    const allowedEvents = filterBlockedBookmakers(events, settings.blockedBookmakers);
    const valueBets = detectValueBets(allowedEvents, {
      bankroll,
      minEvPercent,
      kellyFraction: settings.kellyFraction,
    });

    notifyNewOpportunities(
      'valuebets',
      valueBets,
      settings.webhookUrl,
      settings.webhookAlertsEnabled,
      (v) =>
        `${v.eventName} (${v.competition}) — ${v.outcomeLabel} @ ${v.odds.toFixed(2)} en ${v.bookmaker}, ` +
        `EV +${v.evPercent.toFixed(2)}% (cuota justa ${v.fairOdds.toFixed(2)})`
    );

    res.json({ data: valueBets, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error detectando cuotas de alto valor' });
  }
});
