/**
 * services/surebetDetector.ts
 * ------------------------------------------------------------------
 * Toma los eventos crudos de los providers (cada uno con sus cuotas
 * por casa) y, para cada evento, calcula si el MEJOR precio de cada
 * resultado (venga de la casa que venga) constituye una surebet.
 * ------------------------------------------------------------------
 */

import { randomUUID } from 'crypto';
import { MarketEvent, SurebetRecord } from '../types';
import { calculateArbitrage, OutcomeInput } from '../math/arbitrage';

/**
 * Para un evento dado, se queda con la MEJOR cuota de cada resultado
 * (comparando entre todas las casas que cubren ese evento) y comprueba
 * si combinarlas genera arbitraje.
 */
export function detectSurebetForEvent(
  event: MarketEvent,
  bankroll: number
): SurebetRecord | null {
  // Agrupar cuotas por resultado y quedarnos con la mejor de cada una
  const bestByOutcome = new Map<string, MarketEvent['quotes'][number]>();
  for (const quote of event.quotes) {
    const current = bestByOutcome.get(quote.outcomeId);
    if (!current || quote.odds > current.odds) {
      bestByOutcome.set(quote.outcomeId, quote);
    }
  }

  const outcomes: OutcomeInput[] = Array.from(bestByOutcome.values()).map((q) => ({
    id: q.outcomeId,
    label: q.outcomeLabel,
    odds: q.odds,
    bookmaker: q.bookmaker,
    commission: q.commission,
  }));

  if (outcomes.length < 2) return null;

  const result = calculateArbitrage(outcomes, bankroll);
  if (!result.isArbitrage) return null;

  return {
    id: randomUUID(),
    sport: event.sport,
    competition: event.competition,
    eventName: event.eventName,
    market: event.market,
    startTime: event.startTime,
    detectedAt: new Date().toISOString(),
    profitPercent: result.profitPercent,
    roi: result.roi,
    guaranteedProfit: result.guaranteedProfit,
    totalStake: result.totalStake,
    bankrollUsed: bankroll,
    bookmakers: Array.from(new Set(result.outcomes.map((o) => o.bookmaker))),
    outcomes: result.outcomes.map((o) => ({
      outcomeId: o.id,
      outcomeLabel: o.label,
      bookmaker: o.bookmaker,
      odds: o.odds,
      stake: o.stake,
      payout: o.payout,
    })),
    isDemo: event.isDemo,
    source: event.source,
  };
}

export function detectSurebets(
  events: MarketEvent[],
  bankroll: number
): SurebetRecord[] {
  return events
    .map((event) => detectSurebetForEvent(event, bankroll))
    .filter((r): r is SurebetRecord => r !== null)
    .sort((a, b) => b.profitPercent - a.profitPercent);
}
