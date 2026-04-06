import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "gtm.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS youtube_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL,
      month TEXT NOT NULL,
      views INTEGER NOT NULL,
      days INTEGER DEFAULT 7,
      current INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(week)
    );

    CREATE TABLE IF NOT EXISTS youtube_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      views INTEGER NOT NULL,
      days INTEGER NOT NULL,
      daily_avg INTEGER NOT NULL,
      mom_pct REAL,
      note TEXT DEFAULT '',
      partial INTEGER DEFAULT 0,
      projected INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(month)
    );

    CREATE TABLE IF NOT EXISTS youtube_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      published TEXT NOT NULL,
      title TEXT NOT NULL,
      views INTEGER NOT NULL,
      impressions INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      subs INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(title)
    );

    CREATE TABLE IF NOT EXISTS shorts_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL,
      clips INTEGER NOT NULL,
      total_views INTEGER NOT NULL,
      avg_per_clip INTEGER NOT NULL,
      impressions INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(week)
    );

    CREATE TABLE IF NOT EXISTS linkedin_dianne_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL,
      date TEXT NOT NULL,
      post_time TEXT DEFAULT '',
      impressions INTEGER NOT NULL,
      reactions INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      reposts INTEGER DEFAULT 0,
      saves INTEGER DEFAULT 0,
      followers INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(week, date)
    );

    CREATE TABLE IF NOT EXISTS linkedin_dianne_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      impressions INTEGER NOT NULL,
      saves INTEGER NOT NULL,
      posts INTEGER DEFAULT 0,
      mom_imp REAL,
      mom_saves REAL,
      partial INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(month)
    );

    CREATE TABLE IF NOT EXISTS linkedin_tdp_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL,
      impressions INTEGER NOT NULL,
      clicks INTEGER DEFAULT 0,
      ctr REAL DEFAULT 0,
      reactions INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(week)
    );

    CREATE TABLE IF NOT EXISTS cold_email_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign TEXT NOT NULL,
      status TEXT DEFAULT 'Active',
      window TEXT DEFAULT '',
      sent INTEGER DEFAULT 0,
      contacted INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      reply_rate REAL DEFAULT 0,
      interested INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(campaign)
    );
  `);
}

// ===== Query helpers =====
export function getAllFromTable(table: string) {
  return getDb().prepare(`SELECT * FROM ${table} ORDER BY id ASC`).all();
}

export function upsertRow(table: string, data: Record<string, unknown>, uniqueKeys: string[]) {
  const db = getDb();
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => "?").join(", ");
  const updateSet = keys
    .filter((k) => !uniqueKeys.includes(k))
    .map((k) => `${k} = excluded.${k}`)
    .join(", ");

  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})
    ON CONFLICT(${uniqueKeys.join(", ")}) DO UPDATE SET ${updateSet}`;

  return db.prepare(sql).run(...values);
}

export function bulkUpsert(table: string, rows: Record<string, unknown>[], uniqueKeys: string[]) {
  const db = getDb();
  const tx = db.transaction(() => {
    for (const row of rows) {
      upsertRow(table, row, uniqueKeys);
    }
  });
  tx();
  return { inserted: rows.length };
}
