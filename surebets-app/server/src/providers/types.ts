/**
 * providers/types.ts
 * ------------------------------------------------------------------
 * Contrato que debe cumplir cualquier fuente de cuotas (provider),
 * ya sea DEMO, una API oficial de una casa de apuestas, o un scraper
 * propio. Añadir una nueva fuente NUNCA debe requerir tocar el resto
 * de la aplicación: solo hay que implementar esta interfaz y
 * registrarla en `providers/index.ts`.
 * ------------------------------------------------------------------
 */

import { MarketEvent } from '../types';

export interface OddsProvider {
  /** Nombre único del proveedor (ej: "demo", "betfair", "bet365-scraper") */
  readonly name: string;

  /** Si es true, los datos devueltos son simulados/no reales */
  readonly isDemo: boolean;

  /**
   * Devuelve la lista actual de eventos con sus cuotas.
   * Debe ser asíncrono para poder acomodar llamadas HTTP reales
   * (fetch a una API, scraping, etc.) en el futuro.
   */
  fetchOdds(): Promise<MarketEvent[]>;
}
