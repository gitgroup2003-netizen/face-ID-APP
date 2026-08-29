import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'gitgroup.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guardians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT,
    phone TEXT,
    photo_path TEXT NOT NULL,
    descriptor TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pickup_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
    guardian_id INTEGER REFERENCES guardians(id) ON DELETE SET NULL,
    matched INTEGER NOT NULL,
    confidence REAL,
    snapshot_path TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface ChildRow {
  id: number;
  name: string;
  grade: string | null;
  notes: string | null;
  created_at: string;
}

export interface GuardianRow {
  id: number;
  child_id: number;
  name: string;
  relationship: string | null;
  phone: string | null;
  photo_path: string;
  descriptor: string;
  created_at: string;
}

export interface PickupLogRow {
  id: number;
  child_id: number | null;
  guardian_id: number | null;
  matched: number;
  confidence: number | null;
  snapshot_path: string | null;
  note: string | null;
  created_at: string;
}
