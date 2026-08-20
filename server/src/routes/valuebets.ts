/**
 * routes/valuebets.ts
 * ------------------------------------------------------------------
 * GET /api/valuebets/live    -> calcula AHORA MISMO las cuotas de alto
 *   valor (value bets): cuotas individuales cuyo precio supera la
 *   probabilidad de consenso del mercado. Se guardan en `value_bets`
 *   (igual que las surebets en `surebets`) para poder consultarlas
 *   luego en /history y registrarles un resultado en "Resultados".
 * GET /api/valuebets/history -> historial guardado (con filtros),
 *   con la información de liquidación ya calculada si el evento tiene
 *   un resultado registrado (ver `services/resultsService.ts`).
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { db } from '../db/db';
import { getAllOdds } from '../providers';
import { detectValueBets } from '../services/valueBetDetector';
import { filterBlockedBookmakers } from '../utils/bookmakers';
import { notifyNewOpportunities } from '../services/webhookNotifier';
import { attachValueBetSettlement, getAllEventResults } from '../services/resultsService';
import { ValueBetRecord } from '../types';

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

function saveValueBet(record: ValueBetRecord): void {
  // OR REPLACE con el mismo id estable (evento+resultado+casa): un
  // refresco posterior actualiza la fila en vez de duplicarla, igual
  // que `saveSurebet` en routes/surebets.ts.
  db.prepare(
    `INSERT OR REPLACE INTO value_bets
      (id, event_id, sport, competition, event_name, market, start_time, detected_at,
       outcome_id, outcome_label, bookmaker, odds, fair_odds, fair_probability, ev_percent,
       books_used, suggested_stake, bankroll_used, is_demo, source)
     VALUES (@id, @eventId, @sport, @competition, @eventName, @market, @startTime, @detectedAt,
             @outcomeId, @outcomeLabel, @bookmaker, @odds, @fairOdds, @fairProbability, @evPercent,
             @booksUsed, @suggestedStake, @bankrollUsed, @isDemo, @source)`
  ).run({ ...record, isDemo: record.isDemo ? 1 : 0 });
}

function rowToRecord(row: any): ValueBetRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    sport: row.sport,
    competition: row.competition,
    eventName: row.event_name,
    market: row.market,
    startTime: row.start_time,
    detectedAt: row.detected_at,
    outcomeId: row.outcome_id,
    outcomeLabel: row.outcome_label,
    bookmaker: row.bookmaker,
    odds: row.odds,
    fairOdds: row.fair_odds,
    fairProbability: row.fair_probability,
    evPercent: row.ev_percent,
    booksUsed: row.books_used,
    suggestedStake: row.suggested_stake,
    bankrollUsed: row.bankroll_used,
    isDemo: !!row.is_demo,
    source: row.source,
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
    valueBets.forEach(saveValueBet);

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

// GET /api/valuebets/history?sport=futbol&bookmaker=Bet365&minEv=1&search=Real&sortBy=ev
valueBetsRouter.get('/history', (req, res) => {
  const { sport, bookmaker, minEv, search, limit, sortBy } = req.query;

  let query = 'SELECT * FROM value_bets WHERE 1=1';
  const params: Record<string, unknown> = {};

  if (sport) {
    query += ' AND sport = @sport';
    params.sport = sport;
  }
  if (bookmaker) {
    query += ' AND bookmaker = @bookmaker';
    params.bookmaker = bookmaker;
  }
  if (minEv) {
    query += ' AND ev_percent >= @minEv';
    params.minEv = Number(minEv);
  }
  if (search) {
    query += ' AND (event_name LIKE @search OR competition LIKE @search)';
    params.search = `%${search}%`;
  }

  const orderColumn =
    sortBy === 'startTime' ? 'start_time ASC' : sortBy === 'ev' ? 'ev_percent DESC' : 'detected_at DESC';
  query += ` ORDER BY ${orderColumn} LIMIT @limit`;
  params.limit = limit ? Number(limit) : 200;

  const rows = db.prepare(query).all(params) as any[];
  const records = rows.map(rowToRecord);

  const results = getAllEventResults();
  res.json({ data: records.map((r) => attachValueBetSettlement(r, results)) });
});
