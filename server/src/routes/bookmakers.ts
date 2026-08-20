/**
 * routes/bookmakers.ts
 * GET /api/bookmakers -> lista de casas de apuestas para pintar el
 * listado de veto en Configuración con ticks.
 *
 * Combina el catálogo ESTÁTICO conocido (`data/bookmakers.ts`) con las
 * casas observadas en las cuotas en vivo ahora mismo. Así la lista
 * nunca aparece vacía (ver comentario de cabecera de `data/bookmakers.ts`)
 * aunque en este momento no haya cuotas cargadas o el proveedor real
 * esté caído — este endpoint NUNCA responde con un array vacío ni con
 * un error 500 por ese motivo.
 */

import { Router } from 'express';
import { getAllOdds } from '../providers';
import { extractBookmakers } from '../utils/bookmakers';
import { KNOWN_BOOKMAKERS } from '../data/bookmakers';

export const bookmakersRouter = Router();

bookmakersRouter.get('/', async (_req, res) => {
  let live: string[] = [];
  try {
    const events = await getAllOdds();
    live = extractBookmakers(events);
  } catch (err) {
    // Un provider caído no debe dejar el listado de veto vacío: se
    // responde igualmente con el catálogo conocido.
    console.error('[bookmakers] error obteniendo cuotas en vivo:', err);
  }

  const merged = Array.from(new Set([...KNOWN_BOOKMAKERS, ...live])).sort((a, b) =>
    a.localeCompare(b)
  );
  res.json({ data: merged });
});
