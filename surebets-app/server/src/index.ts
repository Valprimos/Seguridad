/**
 * index.ts — punto de entrada del backend
 */

import express from 'express';
import cors from 'cors';
import { initDb } from './db/db';
import { surebetsRouter } from './routes/surebets';
import { settingsRouter } from './routes/settings';
import { SPORTS } from './types';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

initDb();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', demo: true });
});

app.get('/api/sports', (_req, res) => {
  res.json({ data: SPORTS });
});

app.use('/api/surebets', surebetsRouter);
app.use('/api/settings', settingsRouter);

app.listen(PORT, () => {
  console.log(`🟢 API surebets escuchando en http://localhost:${PORT}`);
  console.log('   Datos servidos por el provider DEMO (ver server/src/providers/demoProvider.ts)');
});
