/**
 * routes/bookmakers.ts
 * GET /api/bookmakers -> lista de casas de apuestas presentes en las
 * cuotas actuales (independientemente de si están vetadas o no), para
 * poder pintar el listado de veto en Configuración con ticks.
 */

import { Router } from 'express';
import { getAllOdds } from '../providers';
import { extractBookmakers } from '../utils/bookmakers';

export const bookmakersRouter = Router();

bookmakersRouter.get('/', async (_req, res) => {
  try {
    const events = await getAllOdds();
    res.json({ data: extractBookmakers(events) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo casas de apuestas' });
  }
});
