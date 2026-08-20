/**
 * utils/bookmakers.ts
 * ------------------------------------------------------------------
 * Utilidades para "vetar" casas de apuestas: el usuario puede
 * desmarcar una casa en Configuración y dejará de tenerse en cuenta
 * tanto para surebets como para cuotas de alto valor (no solo se
 * oculta en la UI, se excluye del cálculo).
 * ------------------------------------------------------------------
 */

import { MarketEvent } from '../types';

/** Quita las cuotas de las casas vetadas de cada evento (no el evento entero:
 * el resto de casas del mismo evento se siguen evaluando con normalidad). */
export function filterBlockedBookmakers(
  events: MarketEvent[],
  blockedBookmakers: string[]
): MarketEvent[] {
  if (blockedBookmakers.length === 0) return events;
  const blocked = new Set(blockedBookmakers);
  return events
    .map((event) => ({
      ...event,
      quotes: event.quotes.filter((q) => !blocked.has(q.bookmaker)),
    }))
    .filter((event) => event.quotes.length > 0);
}

/** Extrae la lista de casas de apuestas únicas presentes en un conjunto de eventos, ordenada. */
export function extractBookmakers(events: MarketEvent[]): string[] {
  const set = new Set<string>();
  events.forEach((e) => e.quotes.forEach((q) => set.add(q.bookmaker)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
