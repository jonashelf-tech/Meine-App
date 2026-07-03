-- ADHS-Sync — D1-Schema (sync-architektur.md §5)

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT UNIQUE NOT NULL,   -- SHA-256 des Bearer-Tokens; Klartext-Token kennt nur der Client
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS backups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  bytes      INTEGER NOT NULL,
  envelope   TEXT NOT NULL           -- verschlüsseltes Envelope {v,alg,zip,iv,ct} als JSON-String
);

CREATE INDEX IF NOT EXISTS idx_backups_user ON backups (user_id, created_at DESC);

-- Etappe 3 (Sync) — schon angelegt, noch ohne Endpoints:
CREATE TABLE IF NOT EXISTS kv (
  user_ns           TEXT NOT NULL,   -- 'u:<id>' oder 'p:<pairId>' (geteilter Kalender)
  key_id            TEXT NOT NULL,   -- HMAC-pseudonymisierter Storage-Key
  version           INTEGER NOT NULL,
  ciphertext        TEXT NOT NULL,
  client_changed_at INTEGER,
  server_at         INTEGER NOT NULL,
  PRIMARY KEY (user_ns, key_id)
);
