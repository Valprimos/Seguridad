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
import { theOddsApiProvider } from './theOddsApiProvider';

// Si existe la variable de entorno ODDS_API_KEY, se usan datos REALES
// de The Odds API. Si no, se usa el provider DEMO (datos simulados)
// para que la app funcione igualmente sin configurar nada.
const providers: OddsProvider[] = process.env.ODDS_API_KEY
  ? [theOddsApiProvider]
  : [demoProvider];

export function isUsingRealData(): boolean {
  return providers.some((p) => !p.isDemo);
}

// Caché en memoria muy corta (unos segundos) del resultado combinado de
// todos los providers. Antes, cada endpoint que consulta cuotas
// (/surebets/live, /valuebets/live, /bookmakers) llamaba a getAllOdds()
// por separado; con el provider DEMO (que genera cuotas aleatorias en
// cada llamada) eso significaba que, dentro del MISMO refresco del
// frontend, cada endpoint veía datos ligeramente distintos — por
// ejemplo, la lista de casas para vetar no coincidía exactamente con
// las casas usadas al detectar surebets. Esta caché asegura que todas
// las peticiones que caen dentro de la misma ventana ven el mismo
// snapshot de cuotas.
const ODDS_CACHE_TTL_MS = 20_000;
let oddsCache: { data: MarketEvent[]; timestamp: number } | null = null;

export async function getAllOdds(): Promise<MarketEvent[]> {
  if (oddsCache && Date.now() - oddsCache.timestamp < ODDS_CACHE_TTL_MS) {
    return oddsCache.data;
  }

  const results = await Promise.all(
    providers.map((p) =>
      p.fetchOdds().catch((err) => {
        // Un provider caído no debe tumbar el resto de la app
        console.error(`[provider:${p.name}] error al obtener cuotas:`, err);
        return [] as MarketEvent[];
      })
    )
  );

  const data = results.flat();
  oddsCache = { data, timestamp: Date.now() };
  return data;
}

export { OddsProvider };
