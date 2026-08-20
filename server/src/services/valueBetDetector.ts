/**
 * services/valueBetDetector.ts
 * ------------------------------------------------------------------
 * Toma los eventos crudos de los providers y, para cada evento con
 * suficientes casas cubriéndolo, calcula la probabilidad de consenso
 * ("justa") de cada resultado y detecta qué cuotas individuales pagan
 * por encima de esa probabilidad (cuotas de alto valor / value bets).
 * ------------------------------------------------------------------
 */

import { MarketEvent, ValueBetRecord } from '../types';
import {
  computeFairOutcomes,
  evaluateValue,
  roundMoney,
  round,
  MIN_BOOKS_FOR_FAIR_ODDS,
  ValueQuoteInput,
} from '../math/valuebet';

export interface ValueBetOptions {
  bankroll: number;
  minEvPercent: number;
  kellyFraction: number;
}

export function detectValueBetsForEvent(
  event: MarketEvent,
  opts: ValueBetOptions
): ValueBetRecord[] {
  const quotesByBookmaker = new Map<string, ValueQuoteInput[]>();
  const outcomeLabels = new Map<string, string>();

  for (const quote of event.quotes) {
    outcomeLabels.set(quote.outcomeId, quote.outcomeLabel);
    const list = quotesByBookmaker.get(quote.bookmaker) ?? [];
    list.push(quote);
    quotesByBookmaker.set(quote.bookmaker, list);
  }

  // Solo tienen sentido las casas que cubren TODOS los resultados del
  // evento: para des-margenar necesitamos su mercado completo.
  const totalOutcomes = outcomeLabels.size;
  for (const [bookmaker, quotes] of quotesByBookmaker) {
    if (quotes.length < totalOutcomes) quotesByBookmaker.delete(bookmaker);
  }

  if (quotesByBookmaker.size < MIN_BOOKS_FOR_FAIR_ODDS) return [];

  const fairOutcomes = computeFairOutcomes(quotesByBookmaker, outcomeLabels);
  const fairByOutcome = new Map(fairOutcomes.map((f) => [f.outcomeId, f]));

  const records: ValueBetRecord[] = [];

  for (const [bookmaker, quotes] of quotesByBookmaker) {
    for (const quote of quotes) {
      const fair = fairByOutcome.get(quote.outcomeId);
      if (!fair || fair.fairProbability <= 0) continue;

      const { evPercent, kellyFraction } = evaluateValue(quote.odds, fair.fairProbability);
      if (evPercent < opts.minEvPercent) continue;

      const suggestedStake = roundMoney(opts.bankroll * kellyFraction * opts.kellyFraction);

      records.push({
        // ID ESTABLE: evento + resultado + casa, para que refrescos
        // sucesivos actualicen la misma fila en vez de duplicarla.
        id: `${event.id}::${quote.outcomeId}::${bookmaker}`,
        sport: event.sport,
        competition: event.competition,
        eventName: event.eventName,
        market: event.market,
        startTime: event.startTime,
        detectedAt: new Date().toISOString(),
        outcomeId: quote.outcomeId,
        outcomeLabel: quote.outcomeLabel,
        bookmaker,
        odds: quote.odds,
        fairOdds: round(fair.fairOdds, 3),
        fairProbability: round(fair.fairProbability, 4),
        evPercent: round(evPercent, 2),
        booksUsed: fair.booksUsed,
        suggestedStake,
        bankrollUsed: opts.bankroll,
        isDemo: event.isDemo,
        source: event.source,
      });
    }
  }

  return records;
}

export function detectValueBets(events: MarketEvent[], opts: ValueBetOptions): ValueBetRecord[] {
  return events
    .flatMap((event) => detectValueBetsForEvent(event, opts))
    .sort((a, b) => b.evPercent - a.evPercent);
}
