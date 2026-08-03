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

export const surebetsRouter = Router();

function getDefaultBankroll(): number {
  const row = db
    .prepare('SELECT default_bankroll as bankroll FROM settings WHERE id = 1')
    .get() as { bankroll: number } | undefined;
  return row?.bankroll ?? 1000;
}

function saveSurebet(record: SurebetRecord): void {
  db.prepare(
    `INSERT OR IGNORE INTO surebets
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
    const bankroll = Number(req.query.bankroll) || getDefaultBankroll();
    const events = await getAllOdds();
    const surebets = detectSurebets(events, bankroll);
    surebets.forEach(saveSurebet);
    res.json({ data: surebets, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error detectando surebets' });
  }
});

// GET /api/surebets/history?sport=futbol&bookmaker=BetDemo+A&minProfit=1&search=Real
surebetsRouter.get('/history', (req, res) => {
  const { sport, bookmaker, minProfit, search, limit } = req.query;

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
  query += ' ORDER BY detected_at DESC LIMIT @limit';
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
