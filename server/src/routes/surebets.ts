/**
 * routes/surebets.ts
 * ------------------------------------------------------------------
 * Endpoints:
 *   GET  /api/surebets/live       -> detecta surebets AHORA MISMO (providers) y las guarda en historial
 *   GET  /api/surebets/history    -> historial guardado (con filtros)
 *   GET  /api/surebets/stats      -> estadísticas agregadas
 *   POST /api/surebets/calculate  -> cálculo manual de arbitraje (cuotas introducidas a mano)
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { db } from '../db/db';
import { getAllOdds } from '../providers';
import { detectSurebets } from '../services/surebetDetector';
import { calculateArbitrage, OutcomeInput } from '../math/arbitrage';
import { SurebetRecord } from '../types';
import { filterBlockedBookmakers } from '../utils/bookmakers';
import { notifyNewOpportunities } from '../services/webhookNotifier';

export const surebetsRouter = Router();

interface LiveSettings {
  bankroll: number;
  currency: string;
  blockedBookmakers: string[];
  minProfitAlert: number;
  webhookUrl: string;
  webhookAlertsEnabled: boolean;
}

function getLiveSettings(): LiveSettings {
  const row = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
  return {
    bankroll: row?.default_bankroll ?? 1000,
    currency: row?.currency ?? 'EUR',
    blockedBookmakers: JSON.parse(row?.blocked_bookmakers || '[]'),
    minProfitAlert: row?.min_profit_alert ?? 1.5,
    webhookUrl: row?.webhook_url || '',
    webhookAlertsEnabled: !!row?.webhook_alerts_enabled,
  };
}

function saveSurebet(record: SurebetRecord): void {
  // OR REPLACE (no OR IGNORE): si esta misma oportunidad (mismo id
  // estable) ya existía, se ACTUALIZA con las cuotas/beneficio más
  // recientes en vez de crear una fila duplicada. Esto es clave para
  // que el historial no se llene de partidos repetidos y para que las
  // estadísticas de "hoy" no sumen la misma oportunidad una y otra vez.
  db.prepare(
    `INSERT OR REPLACE INTO surebets
      (id, sport, competition, event_name, market, start_time, detected_at,
       profit_percent, roi, guaranteed_profit, total_stake, bankroll_used,
       bookmakers, outcomes, is_demo, source)
     VALUES (@id, @sport, @competition, @eventName, @market, @startTime, @detectedAt,
             @profitPercent, @roi, @guaranteedProfit, @totalStake, @bankrollUsed,
             @bookmakers, @outcomes, @isDemo, @source)`
  ).run({
    ...record,
    bookmakers: JSON.stringify(record.bookmakers),
    outcomes: JSON.stringify(record.outcomes),
    isDemo: record.isDemo ? 1 : 0,
  });
}

function rowToRecord(row: any): SurebetRecord {
  return {
    id: row.id,
    sport: row.sport,
    competition: row.competition,
    eventName: row.event_name,
    market: row.market,
    startTime: row.start_time,
    detectedAt: row.detected_at,
    profitPercent: row.profit_percent,
    roi: row.roi,
    guaranteedProfit: row.guaranteed_profit,
    totalStake: row.total_stake,
    bankrollUsed: row.bankroll_used,
    bookmakers: JSON.parse(row.bookmakers),
    outcomes: JSON.parse(row.outcomes),
    isDemo: !!row.is_demo,
    source: row.source,
  };
}

// GET /api/surebets/live?bankroll=1000
surebetsRouter.get('/live', async (req, res) => {
  try {
    const settings = getLiveSettings();
    const bankroll = Number(req.query.bankroll) || settings.bankroll;
    const events = await getAllOdds();
    const allowedEvents = filterBlockedBookmakers(events, settings.blockedBookmakers);
    const surebets = detectSurebets(allowedEvents, bankroll);
    surebets.forEach(saveSurebet);

    notifyNewOpportunities(
      'surebets',
      surebets.filter((s) => s.profitPercent >= settings.minProfitAlert),
      settings.webhookUrl,
      settings.webhookAlertsEnabled,
      (s) =>
        `${s.eventName} (${s.competition}) — ${s.profitPercent.toFixed(2)}% beneficio, ` +
        `${s.guaranteedProfit.toFixed(2)} ${settings.currency} garantizados en ${s.bookmakers.join(', ')}`
    );

    res.json({ data: surebets, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error detectando surebets' });
  }
});

// GET /api/surebets/history?sport=futbol&bookmaker=BetDemo+A&minProfit=1&search=Real&sortBy=startTime
surebetsRouter.get('/history', (req, res) => {
  const { sport, bookmaker, minProfit, search, limit, sortBy } = req.query;

  let query = 'SELECT * FROM surebets WHERE 1=1';
  const params: Record<string, unknown> = {};

  if (sport) {
    query += ' AND sport = @sport';
    params.sport = sport;
  }
  if (minProfit) {
    query += ' AND profit_percent >= @minProfit';
    params.minProfit = Number(minProfit);
  }
  if (search) {
    query += ' AND (event_name LIKE @search OR competition LIKE @search)';
    params.search = `%${search}%`;
  }

  const orderColumn =
    sortBy === 'startTime'
      ? 'start_time ASC'
      : sortBy === 'profit'
      ? 'profit_percent DESC'
      : 'detected_at DESC';
  query += ` ORDER BY ${orderColumn} LIMIT @limit`;
  params.limit = limit ? Number(limit) : 200;

  let rows = db.prepare(query).all(params) as any[];
  let records = rows.map(rowToRecord);

  // Filtro por casa de apuestas (se hace en memoria porque está serializado en JSON)
  if (bookmaker) {
    records = records.filter((r) => r.bookmakers.includes(String(bookmaker)));
  }

  res.json({ data: records });
});

// GET /api/surebets/stats
surebetsRouter.get('/stats', (_req, res) => {
  const totalRow = db
    .prepare('SELECT COUNT(*) as count, AVG(profit_percent) as avg FROM surebets')
    .get() as { count: number; avg: number | null };

  const best = db
    .prepare('SELECT * FROM surebets ORDER BY profit_percent DESC LIMIT 1')
    .get() as any | undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRows = db
    .prepare('SELECT guaranteed_profit as profit FROM surebets WHERE detected_at >= @start')
    .all({ start: today.toISOString() }) as { profit: number }[];

  const potentialDailyProfit = todayRows.reduce((sum, r) => sum + r.profit, 0);

  const bySport = db
    .prepare('SELECT sport, COUNT(*) as count FROM surebets GROUP BY sport')
    .all();

  res.json({
    totalSurebets: totalRow.count,
    averageProfitPercent: totalRow.avg ? Math.round(totalRow.avg * 100) / 100 : 0,
    bestOpportunity: best ? rowToRecord(best) : null,
    potentialDailyProfit: Math.round(potentialDailyProfit * 100) / 100,
    bySport,
  });
});

// POST /api/surebets/calculate  { bankroll, outcomes: [{id,label,odds,bookmaker,commission}] }
surebetsRouter.post('/calculate', (req, res) => {
  try {
    const { bankroll, outcomes } = req.body as {
      bankroll: number;
      outcomes: OutcomeInput[];
    };

    if (!bankroll || !outcomes || !Array.isArray(outcomes)) {
      return res.status(400).json({ error: 'bankroll y outcomes son obligatorios' });
    }

    const result = calculateArbitrage(outcomes, bankroll);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Datos inválidos' });
  }
});
