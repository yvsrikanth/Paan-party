-- Initial setup for a NEW, EMPTY D1 database through its dashboard Console.
-- Matches drizzle/0000_mute_bloodstrike.sql and records that migration.
-- Future schema changes must use the normal migrations workflow.

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  revision INTEGER DEFAULT 1 NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_owner_updated
  ON invoices (owner_id, updated_at);

CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT OR IGNORE INTO d1_migrations (name)
  VALUES ('0000_mute_bloodstrike.sql');
