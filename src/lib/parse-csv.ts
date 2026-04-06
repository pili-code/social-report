import * as XLSX from "xlsx";

export interface ParsedData {
  channel: string;
  table: string;
  rows: Record<string, unknown>[];
  columns: string[];
}

const COLUMN_MAP: Record<string, Record<string, string>> = {
  youtube_weekly: {
    week: "week", month: "month", views: "views", days: "days",
  },
  youtube_monthly: {
    month: "month", views: "views", days: "days", daily_avg: "daily_avg",
    "daily avg": "daily_avg", dailyavg: "daily_avg", mom_pct: "mom_pct",
    "mom %": "mom_pct", "mom%": "mom_pct", note: "note",
  },
  youtube_videos: {
    published: "published", title: "title", views: "views",
    impressions: "impressions", ctr: "ctr", subs: "subs",
    subscribers: "subs", note: "note",
  },
  shorts_weekly: {
    week: "week", clips: "clips", total_views: "total_views",
    "total views": "total_views", totalviews: "total_views",
    avg_per_clip: "avg_per_clip", "avg/clip": "avg_per_clip",
    "avg per clip": "avg_per_clip", impressions: "impressions", note: "note",
  },
  linkedin_dianne_posts: {
    week: "week", date: "date", impressions: "impressions",
    reactions: "reactions", comments: "comments", reposts: "reposts",
    saves: "saves", followers: "followers", note: "note",
    post_time: "post_time", time: "post_time",
  },
  linkedin_dianne_monthly: {
    month: "month", impressions: "impressions", saves: "saves",
    posts: "posts", mom_imp: "mom_imp", mom_saves: "mom_saves", note: "note",
  },
  linkedin_tdp_weekly: {
    week: "week", impressions: "impressions", clicks: "clicks",
    ctr: "ctr", reactions: "reactions", note: "note",
  },
  cold_email_campaigns: {
    campaign: "campaign", name: "campaign", status: "status",
    window: "window", sent: "sent", contacted: "contacted",
    replies: "replies", reply_rate: "reply_rate", "reply rate": "reply_rate",
    replyrate: "reply_rate", interested: "interested", note: "note",
  },
};

function normalizeColumnName(col: string): string {
  return col.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function detectTable(headers: string[]): { table: string; mapping: Record<string, string> } | null {
  const normalized = headers.map(normalizeColumnName);
  let bestMatch = "";
  let bestScore = 0;
  let bestMapping: Record<string, string> = {};

  for (const [table, colMap] of Object.entries(COLUMN_MAP)) {
    let score = 0;
    const mapping: Record<string, string> = {};

    for (let i = 0; i < normalized.length; i++) {
      const norm = normalized[i];
      if (colMap[norm]) {
        score++;
        mapping[headers[i]] = colMap[norm];
      } else if (colMap[headers[i].toLowerCase()]) {
        score++;
        mapping[headers[i]] = colMap[headers[i].toLowerCase()];
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = table;
      bestMapping = mapping;
    }
  }

  if (bestScore < 2) return null;
  return { table: bestMatch, mapping: bestMapping };
}

const CHANNEL_LABELS: Record<string, string> = {
  youtube_weekly: "YouTube Weekly",
  youtube_monthly: "YouTube Monthly",
  youtube_videos: "YouTube Videos",
  shorts_weekly: "Shorts",
  linkedin_dianne_posts: "LinkedIn: Dianne",
  linkedin_dianne_monthly: "LinkedIn: Dianne Monthly",
  linkedin_tdp_weekly: "LinkedIn: TDP Page",
  cold_email_campaigns: "Cold Email",
};

export function parseFileBuffer(buffer: Buffer, filename: string): ParsedData[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const results: ParsedData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    if (jsonData.length === 0) continue;

    const headers = Object.keys(jsonData[0]);
    const detected = detectTable(headers);
    if (!detected) continue;

    const { table, mapping } = detected;
    const mappedRows = jsonData.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [origCol, dbCol] of Object.entries(mapping)) {
        mapped[dbCol] = row[origCol];
      }
      return mapped;
    });

    results.push({
      channel: CHANNEL_LABELS[table] || table,
      table,
      rows: mappedRows,
      columns: Object.values(mapping),
    });
  }

  return results;
}

export function parseCSVString(csv: string): ParsedData[] {
  const workbook = XLSX.read(csv, { type: "string" });
  const results: ParsedData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    if (jsonData.length === 0) continue;

    const headers = Object.keys(jsonData[0]);
    const detected = detectTable(headers);
    if (!detected) continue;

    const { table, mapping } = detected;
    const mappedRows = jsonData.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [origCol, dbCol] of Object.entries(mapping)) {
        mapped[dbCol] = row[origCol];
      }
      return mapped;
    });

    results.push({
      channel: CHANNEL_LABELS[table] || table,
      table,
      rows: mappedRows,
      columns: Object.values(mapping),
    });
  }

  return results;
}
