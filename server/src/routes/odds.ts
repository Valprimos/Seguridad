/**
 * routes/odds.ts
 * GET /api/odds/:eventId -> cuotas COMPLETAS (todas las casas, incluidas
 * las vetadas) de un evento concreto, para el desplegable "ver otras
 * cuotas" del Dashboard y de Cuotas de valor. A diferencia de
 * /surebets/live y /valuebets/live, aquí NO se filtran las casas
 * vetadas: el usuario quiere poder comparar el precio de TODAS las
 * casas para decidir dónde apostar, aunque alguna esté excluida de los
 * cálculos automáticos. Se marca cada cuota con `blocked` para que la
 * UI pueda distinguirlas.
 */

import { Router } from 'express';
import { db } from '../db/db';
import { getAllOdds } from '../providers';

export const oddsRouter = Router();

oddsRouter.get('/:eventId', async (req, res) => {
  try {
    const events = await getAllOdds();
    const event = events.find((e) => e.id === req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado (puede que ya no esté en cartera)' });
    }

    const row = db.prepare('SELECT blocked_bookmakers FROM settings WHERE id = 1').get() as
      | { blocked_bookmakers: string }
      | undefined;
    const blocked = new Set<string>(JSON.parse(row?.blocked_bookmakers || '[]'));

    res.json({
      data: {
        ...event,
        quotes: event.quotes.map((q) => ({ ...q, blocked: blocked.has(q.bookmaker) })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error obteniendo las cuotas del evento' });
  }
});
