import { generateText, generateFromImage } from "./ai";

const TABLE_SCHEMAS: Record<string, { columns: string[]; channel: string }> = {
  youtube_weekly: { columns: ["week", "month", "views", "days", "note"], channel: "YouTube Weekly" },
  youtube_monthly: { columns: ["month", "views", "days", "daily_avg", "mom_pct", "note"], channel: "YouTube Monthly" },
  youtube_videos: { columns: ["published", "title", "views", "impressions", "ctr", "subs", "note"], channel: "YouTube Videos" },
  shorts_weekly: { columns: ["week", "clips", "total_views", "avg_per_clip", "impressions", "note"], channel: "Shorts Weekly" },
  linkedin_dianne_posts: { columns: ["week", "date", "post_time", "impressions", "reactions", "comments", "reposts", "saves", "followers", "note"], channel: "LinkedIn: Dianne Posts" },
  linkedin_dianne_monthly: { columns: ["month", "impressions", "saves", "posts", "mom_imp", "mom_saves", "note"], channel: "LinkedIn: Dianne Monthly" },
  linkedin_tdp_weekly: { columns: ["week", "impressions", "clicks", "ctr", "reactions", "note"], channel: "LinkedIn: TDP Weekly" },
  cold_email_campaigns: { columns: ["campaign", "status", "window", "sent", "contacted", "replies", "reply_rate", "interested", "note"], channel: "Cold Email" },
};

const FLOAT_FIELDS = new Set(["ctr", "reply_rate", "mom_pct", "mom_imp", "mom_saves", "daily_avg", "avg_per_clip"]);

export interface AnalysisResult {
  datasets: Array<{
    table: string;
    channel: string;
    columns: string[];
    rows: Record<string, unknown>[];
    missing_fields: Array<{ row_index: number; field: string; suggestion: unknown; reason: string }>;
    analysis: string;
  }>;
  overall_analysis: string;
}

// ============ IMAGE (still full AI) ============
const IMAGE_SYSTEM_PROMPT = `You extract GTM data from screenshots for The Design Project dashboard.

Return ONLY valid JSON with this shape:
{
  "datasets": [{"table": "<name>", "channel": "<label>", "columns": [...], "rows": [...], "missing_fields": [...], "analysis": "..."}],
  "overall_analysis": "..."
}

Available tables:
- youtube_weekly: week, month, views, days
- youtube_monthly: month, views, days, daily_avg, mom_pct
- youtube_videos: published, title, views, impressions, ctr, subs
- shorts_weekly: week, clips, total_views, avg_per_clip, impressions
- linkedin_dianne_posts: week, date, post_time, impressions, reactions, comments, reposts, saves, followers
- linkedin_dianne_monthly: month, impressions, saves, posts, mom_imp, mom_saves
- linkedin_tdp_weekly: week, impressions, clicks, ctr, reactions
- cold_email_campaigns: campaign, status, window, sent, contacted, replies, reply_rate, interested

Format: week "Mar 29–Apr 4", month "Mar 2026". Numbers are integers except ctr/reply_rate/mom_pct (floats).`;

export async function analyzeImage(base64Image: string, mediaType: string): Promise<AnalysisResult> {
  const text = await generateFromImage(
    IMAGE_SYSTEM_PROMPT,
    "Extract the GTM data from this screenshot. Return ONLY the JSON.",
    base64Image,
    mediaType
  );
  return parseLooseJson(text) as AnalysisResult;
}

// ============ CSV/XLSX (deterministic parsing + small AI call for mapping) ============

interface MappingDecision {
  table: string;
  column_map: Record<string, string>; // source column -> target field
  transform?: "daily_to_weekly" | "skip_totals_row" | "none";
  skip_rows?: string[]; // row values to skip (e.g. "Total")
  analysis: string;
}

const MAPPING_SYSTEM_PROMPT = `You classify GTM CSV data for The Design Project dashboard.

Given headers and 3 sample rows, return ONLY this JSON:
{
  "table": "<one of: youtube_weekly, youtube_monthly, youtube_videos, shorts_weekly, linkedin_dianne_posts, linkedin_dianne_monthly, linkedin_tdp_weekly, cold_email_campaigns>",
  "column_map": { "<csv header>": "<target field>" },
  "transform": "<daily_to_weekly | skip_totals_row | none>",
  "skip_rows": ["<value in first col that signals a total/summary row to skip>"],
  "analysis": "1-sentence summary of what this data shows"
}

Target table schemas:
- youtube_weekly: week, month, views, days
- youtube_monthly: month, views, days, daily_avg, mom_pct
- youtube_videos: published, title, views, impressions, ctr, subs
- shorts_weekly: week, clips, total_views, avg_per_clip, impressions
- linkedin_dianne_posts: week, date, post_time, impressions, reactions, comments, reposts, saves, followers
- linkedin_dianne_monthly: month, impressions, saves, posts, mom_imp, mom_saves
- linkedin_tdp_weekly: week, impressions, clicks, ctr, reactions
- cold_email_campaigns: campaign, status, window, sent, contacted, replies, reply_rate, interested

Use "daily_to_weekly" when data has a Date column with daily granularity that should be summed by week.
Use "skip_totals_row" when a row represents a summary total (e.g. value "Total" in first column).
Only map columns that exist in the target schema.`;

const SHORTS_MAX_SECONDS = 180;

function findDurationKey(headers: string[]): string | null {
  return headers.find((h) => /duration/i.test(h)) ?? null;
}

function findPublishedKey(headers: string[]): string | null {
  return headers.find((h) => /publish/i.test(h)) ?? null;
}

function findDateKey(headers: string[]): string | null {
  return headers.find((h) => /^date$/i.test(h)) ?? null;
}

function parseDurationSeconds(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number" && isFinite(val)) return val;
  const s = String(val).trim();
  const asNum = Number(s.replace(/,/g, ""));
  if (isFinite(asNum)) return asNum;
  // Handle HH:MM:SS or MM:SS
  const parts = s.split(":").map((p) => Number(p));
  if (parts.every((p) => isFinite(p))) {
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
}

export async function analyzeRows(rows: Record<string, unknown>[], filename: string): Promise<AnalysisResult> {
  if (rows.length === 0) {
    return { datasets: [], overall_analysis: "Empty file." };
  }

  const headers = Object.keys(rows[0]);
  const sample = rows.slice(0, 3);
  const prompt = `File: "${filename}"\nHeaders: ${JSON.stringify(headers)}\nSample rows:\n${JSON.stringify(sample, null, 2)}`;

  const aiText = await generateText(MAPPING_SYSTEM_PROMPT, prompt);
  const decision = parseLooseJson(aiText) as MappingDecision;

  const schema = TABLE_SCHEMAS[decision.table];
  if (!schema) {
    return {
      datasets: [],
      overall_analysis: `Could not map data to a known table (got "${decision.table}"). ${decision.analysis || ""}`,
    };
  }

  // 1. Filter out "Total"/skip rows
  let workingRows = rows;
  if (decision.skip_rows && decision.skip_rows.length > 0 && headers.length > 0) {
    const firstCol = headers[0];
    workingRows = rows.filter((r) => {
      const v = String(r[firstCol] ?? "").trim();
      return !decision.skip_rows!.includes(v);
    });
  }

  // 2. Split long-form vs shorts by Duration (if column present and target is a YouTube long-form table)
  const durationKey = findDurationKey(headers);
  const isYoutubeLongTarget = decision.table === "youtube_videos" || decision.table === "youtube_weekly";
  let longFormRows = workingRows;
  let shortRows: Record<string, unknown>[] = [];

  if (durationKey && isYoutubeLongTarget) {
    longFormRows = [];
    for (const r of workingRows) {
      const dur = parseDurationSeconds(r[durationKey]);
      if (dur !== null && dur > 0 && dur <= SHORTS_MAX_SECONDS) {
        shortRows.push(r);
      } else {
        longFormRows.push(r);
      }
    }
  }

  // 3. Apply column map + transform for the primary (long-form) dataset
  const primaryDataset = buildDataset(longFormRows, decision, schema);

  const datasets = [primaryDataset];

  // 4. Build shorts_weekly from any short rows
  if (shortRows.length > 0) {
    const shortsDataset = buildShortsWeekly(shortRows, headers);
    if (shortsDataset.rows.length > 0) datasets.push(shortsDataset);
  }

  return {
    datasets,
    overall_analysis: decision.analysis || "",
  };
}

function buildDataset(
  workingRows: Record<string, unknown>[],
  decision: MappingDecision,
  schema: { columns: string[]; channel: string }
) {
  let mapped: Record<string, unknown>[] = workingRows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [src, dst] of Object.entries(decision.column_map)) {
      if (!schema.columns.includes(dst)) continue;
      out[dst] = castValue(row[src], dst);
    }
    return out;
  });

  if (decision.transform === "daily_to_weekly") {
    mapped = aggregateDailyToWeekly(mapped);
  }

  const missing_fields: Array<{ row_index: number; field: string; suggestion: unknown; reason: string }> = [];
  const requiredFields = schema.columns.filter((c) => c !== "note");
  mapped.forEach((row, idx) => {
    for (const field of requiredFields) {
      const v = row[field];
      if (v === null || v === undefined || v === "") {
        missing_fields.push({
          row_index: idx,
          field,
          suggestion: inferSuggestion(field, row, mapped, idx),
          reason: "Not present in source data",
        });
      }
    }
  });

  return {
    table: decision.table,
    channel: schema.channel,
    columns: schema.columns,
    rows: mapped,
    missing_fields,
    analysis: decision.analysis || "",
  };
}

function buildShortsWeekly(shortRows: Record<string, unknown>[], headers: string[]) {
  const schema = TABLE_SCHEMAS["shorts_weekly"];
  const dateKey = findDateKey(headers);
  const publishedKey = findPublishedKey(headers);
  const viewsKey = headers.find((h) => /^views$/i.test(h));
  const impressionsKey = headers.find((h) => /^impressions$/i.test(h));
  const contentKey = headers.find((h) => /^content$/i.test(h)) ?? headers[0];

  // Group by week. Prefer Date (daily granularity), fall back to Publish time.
  type Bucket = { dates: Date[]; views: number; impressions: number; clips: Set<string> };
  const buckets = new Map<string, Bucket>();

  const weekKey = dateKey ?? publishedKey;
  if (!weekKey) {
    return { table: "shorts_weekly", channel: schema.channel, columns: schema.columns, rows: [], missing_fields: [], analysis: "No date column found for shorts aggregation." };
  }

  for (const r of shortRows) {
    const raw = r[weekKey];
    if (!raw) continue;
    const d = new Date(String(raw));
    if (isNaN(d.getTime())) continue;
    const start = startOfWeek(d);
    const key = start.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? { dates: [], views: 0, impressions: 0, clips: new Set<string>() };
    b.dates.push(d);
    b.views += Number(viewsKey ? r[viewsKey] : 0) || 0;
    b.impressions += Number(impressionsKey ? r[impressionsKey] : 0) || 0;
    b.clips.add(String(r[contentKey] ?? ""));
    buckets.set(key, b);
  }

  const sorted = Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  const rows = sorted.map(([, b]) => {
    b.dates.sort((a, b) => a.getTime() - b.getTime());
    const first = b.dates[0];
    const last = b.dates[b.dates.length - 1];
    const clips = b.clips.size;
    return {
      week: `${fmtDay(first)}–${fmtDay(last)}`,
      clips,
      total_views: Math.round(b.views),
      avg_per_clip: clips > 0 ? Math.round(b.views / clips) : 0,
      impressions: Math.round(b.impressions),
      note: null,
    };
  });

  const missing_fields: Array<{ row_index: number; field: string; suggestion: unknown; reason: string }> = [];
  rows.forEach((row, idx) => {
    if (!impressionsKey && (row.impressions === 0)) {
      missing_fields.push({ row_index: idx, field: "impressions", suggestion: null, reason: "Impressions not in source file" });
    }
  });

  return {
    table: "shorts_weekly",
    channel: schema.channel,
    columns: schema.columns,
    rows,
    missing_fields,
    analysis: `Derived from ${shortRows.length} shorts rows (duration ≤ ${SHORTS_MAX_SECONDS}s).`,
  };
}

function castValue(val: unknown, field: string): unknown {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return val;
  const str = String(val).trim();

  // Date-like fields stay strings
  if (field === "week" || field === "month" || field === "date" || field === "published" || field === "post_time" || field === "campaign" || field === "title" || field === "status" || field === "window" || field === "note") {
    return str;
  }

  // Numeric
  const cleaned = str.replace(/,/g, "").replace(/%/g, "").trim();
  const num = Number(cleaned);
  if (!isFinite(num)) return str;
  return FLOAT_FIELDS.has(field) ? num : Math.round(num);
}

function aggregateDailyToWeekly(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  // Rows must have a "week" (date string) and "views" (or similar numeric).
  // Group rows by ISO week (Sun-Sat window).
  const buckets = new Map<string, { dates: Date[]; views: number }>();

  for (const row of rows) {
    const raw = row.week;
    if (!raw) continue;
    const d = new Date(String(raw));
    if (isNaN(d.getTime())) continue;

    const weekStart = startOfWeek(d);
    const key = weekStart.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { dates: [], views: 0 };
    bucket.dates.push(d);
    const views = Number(row.views);
    if (isFinite(views)) bucket.views += views;
    buckets.set(key, bucket);
  }

  const sorted = Array.from(buckets.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  return sorted.map(([, bucket]) => {
    bucket.dates.sort((a, b) => a.getTime() - b.getTime());
    const first = bucket.dates[0];
    const last = bucket.dates[bucket.dates.length - 1];
    return {
      week: `${fmtDay(first)}–${fmtDay(last)}`,
      month: fmtMonth(first),
      views: Math.round(bucket.views),
      days: bucket.dates.length,
      note: null,
    };
  });
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getUTCDay(); // 0 = Sunday
  out.setUTCDate(out.getUTCDate() - day);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDay(d: Date): string {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
function fmtMonth(d: Date): string {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function inferSuggestion(field: string, row: Record<string, unknown>, all: Record<string, unknown>[], idx: number): unknown {
  if (field === "month" && row.week) {
    const wk = String(row.week);
    const m = wk.match(/^([A-Z][a-z]{2})\s+\d+/);
    if (m) {
      const prev = idx > 0 ? String(all[idx - 1].month ?? "") : "";
      const yearMatch = prev.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
      return `${m[1]} ${year}`;
    }
  }
  if (field === "daily_avg" && row.views && row.days) {
    const v = Number(row.views);
    const d = Number(row.days);
    if (isFinite(v) && isFinite(d) && d > 0) return Math.round(v / d);
  }
  if (field === "avg_per_clip" && row.total_views && row.clips) {
    const v = Number(row.total_views);
    const c = Number(row.clips);
    if (isFinite(v) && isFinite(c) && c > 0) return Math.round(v / c);
  }
  return null;
}

function parseLooseJson(text: string): unknown {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(s);
}
