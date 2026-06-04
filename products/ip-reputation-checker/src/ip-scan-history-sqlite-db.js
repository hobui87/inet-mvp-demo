// Lưu lịch sử scan IP vào SQLite — clone pattern từ domain-reputation N5
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dir, '..', 'data', 'scan_history.db');

mkdirSync(join(__dir, '..', 'data'), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS ip_scan_history (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    ip             TEXT    NOT NULL,
    score          INTEGER NOT NULL,
    grade          TEXT    NOT NULL,
    ptr_json       TEXT    NOT NULL,
    asn_json       TEXT,
    rbl_checks_json TEXT   NOT NULL,
    scanned_at     INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ip         ON ip_scan_history(ip);
  CREATE INDEX IF NOT EXISTS idx_scanned_at ON ip_scan_history(scanned_at DESC);
`);

const stmtInsert = db.prepare(`
  INSERT INTO ip_scan_history (ip, score, grade, ptr_json, asn_json, rbl_checks_json, scanned_at)
  VALUES (@ip, @score, @grade, @ptr_json, @asn_json, @rbl_checks_json, @scanned_at)
`);

const stmtRecent = db.prepare(`
  SELECT id, ip, score, grade, ptr_json, asn_json, rbl_checks_json, scanned_at
  FROM ip_scan_history
  ORDER BY scanned_at DESC
  LIMIT ?
`);

const stmtPrune = db.prepare(`
  DELETE FROM ip_scan_history
  WHERE scanned_at < ?
     OR id NOT IN (
       SELECT id FROM ip_scan_history ORDER BY scanned_at DESC LIMIT 500
     )
`);

function parseRow(row) {
  return {
    id:         row.id,
    ip:         row.ip,
    score:      row.score,
    grade:      row.grade,
    ptr:        JSON.parse(row.ptr_json),
    asn:        row.asn_json ? JSON.parse(row.asn_json) : null,
    rbl_checks: JSON.parse(row.rbl_checks_json),
    scanned_at: row.scanned_at,
  };
}

export function saveIpScan(result) {
  try {
    stmtInsert.run({
      ip:              result.ip,
      score:           result.score,
      grade:           result.grade,
      ptr_json:        JSON.stringify(result.ptr),
      asn_json:        result.asn ? JSON.stringify(result.asn) : null,
      rbl_checks_json: JSON.stringify(result.rbl_checks),
      scanned_at:      Date.now(),
    });
    // Prune once every ~50 writes
    if (Math.random() < 0.02) {
      stmtPrune.run(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
  } catch (err) {
    console.warn('[ip-history] write failed:', err.message);
  }
}

export function getIpHistory(limit = 20) {
  return stmtRecent.all(Math.min(limit, 100)).map(parseRow);
}
