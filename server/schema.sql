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

-- Sync-Versionen: atomarer Zähler pro Namespace (Review R4 — MAX+1 über zwei
-- Statements könnte bei gleichzeitigen PUTs doppelte Versionen vergeben,
-- und ein Cursor dazwischen würde eine Row dauerhaft überspringen).
CREATE TABLE IF NOT EXISTS ns_version (
  user_ns TEXT PRIMARY KEY,
  n       INTEGER NOT NULL
);

-- Etappe 3 (Sync):
CREATE TABLE IF NOT EXISTS kv (
  user_ns           TEXT NOT NULL,   -- 'u:<id>' (persönlich) oder 'c:<calId>' (geteilter Kalender)
  key_id            TEXT NOT NULL,   -- HMAC-pseudonymisierter Storage-Key
  version           INTEGER NOT NULL,
  ciphertext        TEXT NOT NULL,
  client_changed_at INTEGER,
  server_at         INTEGER NOT NULL,
  PRIMARY KEY (user_ns, key_id)
);

-- Teilen Stufe A (teilen-spec.md §5): Kalender-Objekte + Mitglieder.
-- Der Server kennt nur calId + joinSecretHash — der calKey (E2E) bleibt beim Client.
CREATE TABLE IF NOT EXISTS cals (
  cal_id           TEXT PRIMARY KEY,
  creator_user     INTEGER NOT NULL,
  join_secret_hash TEXT,              -- NULL = keine offene Einladung (nach Beitritt verbraucht)
  join_expires     INTEGER,
  created_at       INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cal_members (
  cal_id    TEXT NOT NULL,
  user_id   INTEGER NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (cal_id, user_id)
);

-- Buddy (Stufe 1): Nutzungszähler — Kostendeckel für die KI-Calls.
-- period = 'YYYY-MM-DD' (pro Nutzer/Tag) bzw. 'm:YYYY-MM' (global, user_id 0).
CREATE TABLE IF NOT EXISTS buddy_usage (
  user_id INTEGER NOT NULL,
  period  TEXT NOT NULL,
  count   INTEGER NOT NULL,
  PRIMARY KEY (user_id, period)
);
