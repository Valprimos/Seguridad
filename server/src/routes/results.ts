/**
 * routes/results.ts
 * ------------------------------------------------------------------
 * GET    /api/results/pending  -> eventos estudiados sin resultado aún
 * GET    /api/results/summary  -> saldo neto y contadores agregados
 * POST   /api/results          -> registra a mano el resultado real de un evento
 * DELETE /api/results/:eventId -> borra un resultado registrado (por si se equivocó)
 * ------------------------------------------------------------------
 */

import { Router } from 'express';
import { deleteResult, getPendingEvents, getResultsSummary, recordResult } from '../services/resultsService';

export const resultsRouter = Router();

resultsRouter.get('/pending', (_req, res) => {
  res.json({ data: getPendingEvents() });
});

resultsRouter.get('/summary', (_req, res) => {
  res.json(getResultsSummary());
});

// POST /api/results  { eventId, eventName, winningOutcomeId, winningOutcomeLabel }
resultsRouter.post('/', (req, res) => {
  const { eventId, eventName, winningOutcomeId, winningOutcomeLabel } = req.body as {
    eventId?: string;
    eventName?: string;
    winningOutcomeId?: string;
    winningOutcomeLabel?: string;
  };

  if (!eventId || !eventName || !winningOutcomeId || !winningOutcomeLabel) {
    return res
      .status(400)
      .json({ error: 'eventId, eventName, winningOutcomeId y winningOutcomeLabel son obligatorios' });
  }

  const result = recordResult(eventId, eventName, winningOutcomeId, winningOutcomeLabel);
  res.json({ data: result });
});

resultsRouter.delete('/:eventId', (req, res) => {
  deleteResult(req.params.eventId);
  res.json({ ok: true });
});
