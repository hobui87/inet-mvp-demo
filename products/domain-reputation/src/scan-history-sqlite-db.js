// Persistent scan history — SQLite via better-sqlite3 (synchronous)
// DB file: data/scan_history.db (auto-created on first run)
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dir, '..', 'data', 'scan_history.db');

mkdirSync(join(__dir, '..', 'data'), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS scan_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    domain      TEXT    NOT NULL,
    score       INTEGER NOT NULL,
    grade       TEXT    NOT NULL,
    checks_json TEXT    NOT NULL,
    scanned_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_domain      ON scan_history(domain);
  CREATE INDEX IF NOT EXISTS idx_scanned_at  ON scan_history(scanned_at DESC);
`);

const stmtInsert = db.prepare(`
  INSERT INTO scan_history (domain, score, grade, checks_json, scanned_at)
  VALUES (@domain, @score, @grade, @checks_json, @scanned_at)
`);

const stmtRecent = db.prepare(`
  SELECT id, domain, score, grade, checks_json, scanned_at
  FROM scan_history
  ORDER BY scanned_at DESC
  LIMIT ?
`);

const stmtByDomain = db.prepare(`
  SELECT id, domain, score, grade, checks_json, scanned_at
  FROM scan_history
  WHERE domain = ?
  ORDER BY scanned_at DESC
  LIMIT ?
`);

// Prune rows older than 30 days, keep max 500 rows total
const stmtPrune = db.prepare(`
  DELETE FROM scan_history
  WHERE scanned_at < ?
     OR id NOT IN (
       SELECT id FROM scan_history ORDER BY scanned_at DESC LIMIT 500
     )
`);

function parseRow(row) {
  return {
    id: row.id,
    domain: row.domain,
    score: row.score,
    grade: row.grade,
    checks: JSON.parse(row.checks_json),
    scanned_at: row.scanned_at,
  };
}

export function saveCheck(result) {
  try {
    stmtInsert.run({
      domain: result.domain,
      score: result.score,
      grade: result.grade,
      checks_json: JSON.stringify(result.checks),
      scanned_at: Date.now(),
    });
    // Prune once every ~50 writes (random gate — avoid pruning on every write)
    if (Math.random() < 0.02) {
      stmtPrune.run(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
  } catch {
    // Non-critical — history write failure should never break scan response
  }
}

export function getHistory(limit = 20) {
  return stmtRecent.all(Math.min(limit, 100)).map(parseRow);
}

export function getDomainHistory(domain, limit = 10) {
  return stmtByDomain.all(domain, Math.min(limit, 50)).map(parseRow);
}
