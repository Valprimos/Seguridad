/**
 * data/bookmakers.ts
 * ------------------------------------------------------------------
 * Catálogo ESTÁTICO de casas de apuestas conocidas del mercado (solo
 * como nombres/etiquetas — ver aviso DEMO en `providers/demoProvider.ts`).
 *
 * ¿Por qué un catálogo fijo y no derivar la lista solo de las cuotas
 * en vivo? El listado de veto en Configuración necesita existir SIEMPRE,
 * aunque en ese momento no haya ninguna cuota cargada (proveedor real
 * caído, sin partidos ahora mismo para los deportes configurados, o el
 * primer arranque antes del primer refresco). Si el veto dependiera
 * únicamente de `getAllOdds()`, un simple bache temporal de datos haría
 * que el usuario viera "no hay casas de apuestas" y no pudiera vetar
 * nada. `routes/bookmakers.ts` combina este catálogo con las casas
 * observadas en vivo, así la lista nunca está vacía.
 * ------------------------------------------------------------------
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
