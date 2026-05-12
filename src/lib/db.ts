import Database, { type Statement } from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = path.resolve(process.cwd(), "data", "pocket.db");

let _db: Database.Database | null = null;
let _stmtCache: Map<string, Statement> | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("temp_store = MEMORY");
  db.pragma("mmap_size = 134217728"); // 128 MB
  initSchema(db);
  _db = db;
  _stmtCache = new Map();
  return db;
}

// Prepared-statement cache. Reused statements skip the parse/plan step, which
// matters for the per-request hot queries that fire on every page load.
export function prep(sql: string): Statement {
  const db = getDb();
  if (!_stmtCache) _stmtCache = new Map();
  let s = _stmtCache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    _stmtCache.set(sql, s);
  }
  return s;
}

// Typed `.all()` / `.get()` wrappers. Replaces the `as Array<{...}>` cast at
// every call site.
export function queryAll<T>(sql: string, ...params: unknown[]): T[] {
  return prep(sql).all(...params) as T[];
}
export function queryOne<T>(sql: string, ...params: unknown[]): T | undefined {
  return prep(sql).get(...params) as T | undefined;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      game            TEXT NOT NULL,
      format          TEXT,
      date            TEXT NOT NULL,                  -- ISO timestamp
      players         INTEGER NOT NULL,
      organizer_id    INTEGER,
      organizer_name  TEXT,
      organizer_logo  TEXT,
      decklists       INTEGER NOT NULL DEFAULT 0,
      is_online       INTEGER NOT NULL DEFAULT 1,
      is_public       INTEGER NOT NULL DEFAULT 1,
      structure       TEXT,                            -- e.g. "SWISS,SINGLE_BRACKET"
      match_format    TEXT,                            -- e.g. "BO1,BO3"
      banned_count    INTEGER NOT NULL DEFAULT 0,
      special_count   INTEGER NOT NULL DEFAULT 0,
      eligible        INTEGER NOT NULL DEFAULT 0,     -- yuki_1chiban filter
      synced_at       TEXT NOT NULL                    -- ISO timestamp
    );
    CREATE INDEX IF NOT EXISTS tournament_date_idx ON tournament(date DESC);
    CREATE INDEX IF NOT EXISTS tournament_eligible_idx ON tournament(eligible, date DESC);

    CREATE TABLE IF NOT EXISTS standing (
      tournament_id   TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
      player_id       TEXT NOT NULL,                   -- limitless username, stable
      display_name    TEXT NOT NULL,
      country         TEXT,
      placing         INTEGER NOT NULL,
      wins            INTEGER NOT NULL DEFAULT 0,
      losses          INTEGER NOT NULL DEFAULT 0,
      ties            INTEGER NOT NULL DEFAULT 0,
      drop_round      INTEGER,
      deck_id         TEXT,
      deck_name       TEXT,
      deck_icon_a     TEXT,
      deck_icon_b     TEXT,
      decklist_json   TEXT,                             -- raw decklist JSON (pokemon/trainer/energy)
      points          INTEGER NOT NULL DEFAULT 0,       -- ranking points awarded for this placing
      PRIMARY KEY (tournament_id, player_id)
    );
    CREATE INDEX IF NOT EXISTS standing_player_idx       ON standing(player_id);
    CREATE INDEX IF NOT EXISTS standing_deck_idx         ON standing(deck_id);
    CREATE INDEX IF NOT EXISTS standing_deck_placing_idx ON standing(deck_id, placing);
    CREATE INDEX IF NOT EXISTS standing_country_idx      ON standing(country);
    CREATE INDEX IF NOT EXISTS standing_tournament_idx   ON standing(tournament_id, placing);

    CREATE TABLE IF NOT EXISTS sync_meta (
      key             TEXT PRIMARY KEY,
      value           TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pairing (
      tournament_id   TEXT NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
      round           INTEGER NOT NULL,
      phase           INTEGER NOT NULL,
      table_no        INTEGER,
      match_label     TEXT,
      player1         TEXT NOT NULL,
      player2         TEXT,                            -- null for byes
      result          TEXT NOT NULL CHECK (result IN ('P1_WIN','P2_WIN','TIE','DOUBLE_LOSS','BYE')),
      PRIMARY KEY (tournament_id, round, phase, player1)
    );
    CREATE INDEX IF NOT EXISTS pairing_tournament_idx ON pairing(tournament_id);
    CREATE INDEX IF NOT EXISTS pairing_player1_idx    ON pairing(player1);
    CREATE INDEX IF NOT EXISTS pairing_player2_idx    ON pairing(player2);
  `);
}

export function setMeta(key: string, value: string) {
  prep(
    `INSERT INTO sync_meta(key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, new Date().toISOString());
}

export function getMeta(key: string): string | null {
  const row = queryOne<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = ?`,
    key
  );
  return row?.value ?? null;
}
