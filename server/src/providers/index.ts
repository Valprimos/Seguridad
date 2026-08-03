/**
 * providers/index.ts
 * ------------------------------------------------------------------
 * Punto único de registro de fuentes de cuotas. El resto de la
 * aplicación (servicio detector, rutas) consume `getAllOdds()` y
 * nunca importa un provider concreto directamente.
 *
 * Para añadir una casa de apuestas / API / scraper real:
 *   1. Crea `providers/miCasaProvider.ts` implementando `OddsProvider`.
 *   2. Impórtalo aquí y añádelo al array `providers`.
 * ------------------------------------------------------------------
 */

import { MarketEvent } from '../types';
import { OddsProvider } from './types';
import { demoProvider } from './demoProvider';

// 👉 Registra aquí nuevos proveedores (reales) cuando estén listos.
// Ejemplo futuro:
//   import { betfairProvider } from './betfairProvider';
//   const providers: OddsProvider[] = [demoProvider, betfairProvider];
const providers: OddsProvider[] = [demoProvider];

export async function getAllOdds(): Promise<MarketEvent[]> {
  const results = await Promise.all(
    providers.map((p) =>
      p.fetchOdds().catch((err) => {
        // Un provider caído no debe tumbar el resto de la app
        console.error(`[provider:${p.name}] error al obtener cuotas:`, err);
        return [] as MarketEvent[];
      })
    )
  );
  return results.flat();
}

export { OddsProvider };
