/**
 * utils/knownBookmakers.ts
 * Copia del catálogo estático de `server/src/data/bookmakers.ts`, usada
 * SOLO como último recurso si la petición a GET /api/bookmakers falla
 * por completo (backend inalcanzable) — para que el listado de veto en
 * Configuración nunca se quede vacío.
 */

export const KNOWN_BOOKMAKERS: string[] = [
  'Bet365',
  'Bwin',
  'William Hill',
  'Betfair',
  'Pinnacle',
  '1xBet',
  'Betway',
  'Unibet',
  'Marathonbet',
  '888sport',
  'Codere',
  'Sportium',
  'Betsson',
  'LeoVegas',
  'Interwetten',
];
