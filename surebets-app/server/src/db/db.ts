/**
 * db/db.ts
 * ------------------------------------------------------------------
 * Conexión SQLite (better-sqlite3) + creación de esquema.
 *
 * El acceso a datos está aislado en esta carpeta a propósito: si en
 * el futuro se quiere migrar a PostgreSQL, solo hay que sustituir
 * este archivo (y las consultas de `routes/`) por un driver
 * equivalente (ej: `pg`), manteniendo el mismo esquema lógico.
 * ------------------------------------------------------------------
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', '..', 'surebets.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS surebets (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      competition TEXT NOT NULL,
      event_name TEXT NOT NULL,
      market TEXT NOT NULL,
      start_time TEXT NOT NULL,
      detected_at TEXT NOT NULL,
      profit_percent REAL NOT NULL,
      roi REAL NOT NULL,
      guaranteed_profit REAL NOT NULL,
      total_stake REAL NOT NULL,
      bankroll_used REAL NOT NULL,
      bookmakers TEXT NOT NULL,   -- JSON array
      outcomes TEXT NOT NULL,     -- JSON array
      is_demo INTEGER NOT NULL,
      source TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_surebets_detected_at ON surebets (detected_at);
    CREATE INDEX IF NOT EXISTS idx_surebets_sport ON surebets (sport);

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      default_bankroll REAL NOT NULL,
      currency TEXT NOT NULL,
      language TEXT NOT NULL,
      theme TEXT NOT NULL,
      min_profit_alert REAL NOT NULL,
      sound_alerts_enabled INTEGER NOT NULL,
      browser_notifications_enabled INTEGER NOT NULL
    );
  `);

  const existing = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!existing) {
    db.prepare(
      `INSERT INTO settings
        (id, default_bankroll, currency, language, theme, min_profit_alert, sound_alerts_enabled, browser_notifications_enabled)
       VALUES (1, 1000, 'EUR', 'es', 'dark', 1.5, 1, 1)`
    ).run();
  }
}
