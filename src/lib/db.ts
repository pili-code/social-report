import path from "path";
import fs from "fs";

const IS_VERCEL = !!process.env.VERCEL;
const DB_PATH = path.join(process.cwd(), "gtm.db");
const JSON_PATH = IS_VERCEL ? "/tmp/gtm-data.json" : path.join(process.cwd(), "gtm-data.json");

// ===== Types =====
interface DbData {
  youtube_weekly: Record<string, unknown>[];
  youtube_monthly: Record<string, unknown>[];
  youtube_videos: Record<string, unknown>[];
  shorts_weekly: Record<string, unknown>[];
  linkedin_dianne_posts: Record<string, unknown>[];
  linkedin_dianne_monthly: Record<string, unknown>[];
  linkedin_tdp_weekly: Record<string, unknown>[];
  cold_email_campaigns: Record<string, unknown>[];
}

const EMPTY_DB: DbData = {
  youtube_weekly: [],
  youtube_monthly: [],
  youtube_videos: [],
  shorts_weekly: [],
  linkedin_dianne_posts: [],
  linkedin_dianne_monthly: [],
  linkedin_tdp_weekly: [],
  cold_email_campaigns: [],
};

// ===== JSON-based storage (works everywhere including Vercel) =====
let cachedData: DbData | null = null;

function loadData(): DbData {
  if (cachedData) return cachedData;

  try {
    if (fs.existsSync(JSON_PATH)) {
      const raw = fs.readFileSync(JSON_PATH, "utf-8");
      cachedData = JSON.parse(raw);
      return cachedData!;
    }
  } catch {
    // Fall through to empty
  }

  cachedData = structuredClone(EMPTY_DB);
  return cachedData;
}

function saveData(data: DbData) {
  cachedData = data;
  try {
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2));
  } catch {
    // On Vercel, /tmp may not persist between requests, which is fine
    // The seed data will re-initialize on next cold start
  }
}

// ===== SQLite adapter (local dev) =====
let sqliteDb: import("better-sqlite3").Database | null = null;

async function getSqlite() {
  if (sqliteDb) return sqliteDb;
  try {
    const Database = (await import("better-sqlite3")).default;
    sqliteDb = new Database(DB_PATH);
    sqliteDb.pragma("journal_mode = WAL");
    initSqliteTables(sqliteDb);
    return sqliteDb;
  } catch {
    return null;
  }
}

function initSqliteTables(db: import("better-sqlite3").Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS youtube_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL, month TEXT NOT NULL, views INTEGER NOT NULL,
      days INTEGER DEFAULT 7, current INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(week)
    );
    CREATE TABLE IF NOT EXISTS youtube_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL, views INTEGER NOT NULL, days INTEGER NOT NULL,
      daily_avg INTEGER NOT NULL, mom_pct REAL, note TEXT DEFAULT '',
      partial INTEGER DEFAULT 0, projected INTEGER,
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(month)
    );
    CREATE TABLE IF NOT EXISTS youtube_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      published TEXT NOT NULL, title TEXT NOT NULL, views INTEGER NOT NULL,
      impressions INTEGER DEFAULT 0, ctr REAL DEFAULT 0, subs INTEGER DEFAULT 0,
      note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), UNIQUE(title)
    );
    CREATE TABLE IF NOT EXISTS shorts_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL, clips INTEGER NOT NULL, total_views INTEGER NOT NULL,
      avg_per_clip INTEGER NOT NULL, impressions INTEGER DEFAULT 0,
      note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), UNIQUE(week)
    );
    CREATE TABLE IF NOT EXISTS linkedin_dianne_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL, date TEXT NOT NULL, post_time TEXT DEFAULT '',
      impressions INTEGER NOT NULL, reactions INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0, reposts INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0, followers INTEGER DEFAULT 0,
      note TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(week, date)
    );
    CREATE TABLE IF NOT EXISTS linkedin_dianne_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL, impressions INTEGER NOT NULL, saves INTEGER NOT NULL,
      posts INTEGER DEFAULT 0, mom_imp REAL, mom_saves REAL,
      partial INTEGER DEFAULT 0, note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(month)
    );
    CREATE TABLE IF NOT EXISTS linkedin_tdp_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL, impressions INTEGER NOT NULL, clicks INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0, reactions INTEGER DEFAULT 0, note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(week)
    );
    CREATE TABLE IF NOT EXISTS cold_email_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign TEXT NOT NULL, status TEXT DEFAULT 'Active', window TEXT DEFAULT '',
      sent INTEGER DEFAULT 0, contacted INTEGER DEFAULT 0, replies INTEGER DEFAULT 0,
      reply_rate REAL DEFAULT 0, interested INTEGER DEFAULT 0, note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')), UNIQUE(campaign)
    );
  `);
}

// ===== Public API =====
export function getDb() {
  // For compatibility — returns a marker
  return { type: "json" as const };
}

export function getAllFromTable(table: string): unknown[] {
  const data = loadData();
  return (data as unknown as Record<string, unknown[]>)[table] || [];
}

export function upsertRow(table: string, row: Record<string, unknown>, uniqueKeys: string[]) {
  const data = loadData();
  const tableData = ((data as unknown as Record<string, Record<string, unknown>[]>)[table] || []);

  const existingIdx = tableData.findIndex((existing) =>
    uniqueKeys.every((k) => existing[k] === row[k])
  );

  if (existingIdx >= 0) {
    tableData[existingIdx] = { ...tableData[existingIdx], ...row };
  } else {
    tableData.push({ id: tableData.length + 1, ...row, created_at: new Date().toISOString() });
  }

  (data as unknown as Record<string, unknown[]>)[table] = tableData;
  saveData(data);
}

export function bulkUpsert(table: string, rows: Record<string, unknown>[], uniqueKeys: string[]) {
  for (const row of rows) {
    upsertRow(table, row, uniqueKeys);
  }
  return { inserted: rows.length };
}
