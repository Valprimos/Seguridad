/**
 * services/resultsService.ts
 * ------------------------------------------------------------------
 * Liquidación de oportunidades ya detectadas contra el resultado REAL
 * de cada evento. Como la app no tiene ningún proveedor de resultados
 * conectado, el resultado se introduce a mano desde "Resultados"
 * (ver `routes/results.ts`) y se guarda en la tabla `event_results`,
 * UN resultado por evento, compartido entre surebets y cuotas de valor.
 *
 * - Una surebet, una vez liquidada, siempre suma su `guaranteedProfit`:
 *   por definición de arbitraje, se gana lo mismo gane el resultado que
 *   gane (mientras sea uno de los cubiertos por la surebet).
 * - Una cuota de valor SÍ depende del resultado real: gana
 *   `suggestedStake × (odds − 1)` si acierta, o pierde `suggestedStake`
 *   si no.
 * ------------------------------------------------------------------
 */

import { db } from '../db/db';
import {
  EventResult,
  PendingResultEvent,
  ResultsSummary,
  SettledSurebetRecord,
  SettledValueBetRecord,
  SurebetRecord,
  ValueBetRecord,
} from '../types';

function rowToEventResult(row: any): EventResult {
  return {
    eventId: row.event_id,
    eventName: row.event_name,
    winningOutcomeId: row.winning_outcome_id,
    winningOutcomeLabel: row.winning_outcome_label,
    recordedAt: row.recorded_at,
  };
}

export function getAllEventResults(): Map<string, EventResult> {
  const rows = db.prepare('SELECT * FROM event_results').all() as any[];
  return new Map(rows.map((r) => [r.event_id, rowToEventResult(r)]));
}

export function recordResult(
  eventId: string,
  eventName: string,
  winningOutcomeId: string,
  winningOutcomeLabel: string
): EventResult {
  const recordedAt = new Date().toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO event_results
      (event_id, event_name, winning_outcome_id, winning_outcome_label, recorded_at)
     VALUES (@eventId, @eventName, @winningOutcomeId, @winningOutcomeLabel, @recordedAt)`
  ).run({ eventId, eventName, winningOutcomeId, winningOutcomeLabel, recordedAt });
  return { eventId, eventName, winningOutcomeId, winningOutcomeLabel, recordedAt };
}

export function deleteResult(eventId: string): void {
  db.prepare('DELETE FROM event_results WHERE event_id = ?').run(eventId);
}

export function attachSurebetSettlement(
  record: SurebetRecord,
  results: Map<string, EventResult>
): SettledSurebetRecord {
  const result = results.get(record.id);
  return {
    ...record,
    settled: !!result,
    resultOutcomeLabel: result?.winningOutcomeLabel ?? null,
    actualProfit: result ? record.guaranteedProfit : null,
  };
}

export function attachValueBetSettlement(
  record: ValueBetRecord,
  results: Map<string, EventResult>
): SettledValueBetRecord {
  const result = results.get(record.eventId);
  if (!result) {
    return { ...record, settled: false, resultOutcomeLabel: null, won: null, actualProfit: null };
  }
  const won = record.outcomeId === result.winningOutcomeId;
  const actualProfit = won ? record.suggestedStake * (record.odds - 1) : -record.suggestedStake;
  return {
    ...record,
    settled: true,
    resultOutcomeLabel: result.winningOutcomeLabel,
    won,
    actualProfit: Math.round(actualProfit * 100) / 100,
  };
}

/** Eventos estudiados (con surebet y/o cuota de valor guardada) que aún no
 * tienen un resultado registrado, con sus posibles resultados para el
 * desplegable de "qué ganó" del formulario de registro manual. */
export function getPendingEvents(): PendingResultEvent[] {
  const settledIds = new Set(getAllEventResults().keys());
  const map = new Map<string, PendingResultEvent>();

  const surebetRows = db
    .prepare('SELECT id, event_name, competition, sport, market, start_time, outcomes FROM surebets')
    .all() as any[];
  for (const row of surebetRows) {
    if (settledIds.has(row.id)) continue;
    const entry: PendingResultEvent = map.get(row.id) ?? {
      eventId: row.id,
      eventName: row.event_name,
      competition: row.competition,
      sport: row.sport,
      market: row.market,
      startTime: row.start_time,
      outcomes: [],
    };
    const outcomes = JSON.parse(row.outcomes) as { outcomeId: string; outcomeLabel: string }[];
    for (const o of outcomes) {
      if (!entry.outcomes.some((x) => x.id === o.outcomeId)) {
        entry.outcomes.push({ id: o.outcomeId, label: o.outcomeLabel });
      }
    }
    map.set(row.id, entry);
  }

  const valueBetRows = db
    .prepare(
      'SELECT event_id, event_name, competition, sport, market, start_time, outcome_id, outcome_label FROM value_bets'
    )
    .all() as any[];
  for (const row of valueBetRows) {
    if (settledIds.has(row.event_id)) continue;
    const entry: PendingResultEvent = map.get(row.event_id) ?? {
      eventId: row.event_id,
      eventName: row.event_name,
      competition: row.competition,
      sport: row.sport,
      market: row.market,
      startTime: row.start_time,
      outcomes: [],
    };
    if (!entry.outcomes.some((x) => x.id === row.outcome_id)) {
      entry.outcomes.push({ id: row.outcome_id, label: row.outcome_label });
    }
    map.set(row.event_id, entry);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
}

export function getResultsSummary(): ResultsSummary {
  const results = getAllEventResults();

  const surebetRows = db.prepare('SELECT id, guaranteed_profit FROM surebets').all() as {
    id: string;
    guaranteed_profit: number;
  }[];
  let settledSurebets = 0;
  let surebetProfit = 0;
  for (const row of surebetRows) {
    if (results.has(row.id)) {
      settledSurebets++;
      surebetProfit += row.guaranteed_profit;
    }
  }

  const valueBetRows = db
    .prepare('SELECT event_id, outcome_id, odds, suggested_stake FROM value_bets')
    .all() as { event_id: string; outcome_id: string; odds: number; suggested_stake: number }[];
  let settledValueBets = 0;
  let valueBetsWon = 0;
  let valueBetsLost = 0;
  let valueBetProfit = 0;
  for (const row of valueBetRows) {
    const result = results.get(row.event_id);
    if (!result) continue;
    settledValueBets++;
    if (row.outcome_id === result.winningOutcomeId) {
      valueBetsWon++;
      valueBetProfit += row.suggested_stake * (row.odds - 1);
    } else {
      valueBetsLost++;
      valueBetProfit -= row.suggested_stake;
    }
  }

  return {
    netBalance: Math.round((surebetProfit + valueBetProfit) * 100) / 100,
    settledSurebets,
    settledValueBets,
    valueBetsWon,
    valueBetsLost,
    pendingEvents: getPendingEvents().length,
  };
}
