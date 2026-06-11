import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DIR = "/Users/pilitdp/Downloads/Content 2026-05-13_2026-06-10 The Design Project";
const SHORTS_MAX = 180;
// Cutoff: only keep weeks whose START is on or after this date (and videos published >= this date).
const START_CUTOFF = new Date(Date.UTC(2025, 9, 1)); // 2025-10-01

function readCsv(file) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true });
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const fmtMonth = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
// Week label includes year of the week-start date to distinguish across years.
const fmtWeek = (start, end) => `${fmtDay(start)}–${fmtDay(end)}, ${start.getUTCFullYear()}`;
function startOfWeek(d) {
  const o = new Date(d);
  o.setUTCDate(o.getUTCDate() - o.getUTCDay());
  o.setUTCHours(0, 0, 0, 0);
  return o;
}

async function upsert(table, rows, onConflict) {
  if (rows.length === 0) return 0;
  const seen = new Map();
  const keys = onConflict.split(",");
  for (const r of rows) {
    const k = keys.map((x) => String(r[x] ?? "")).join("\u0000");
    const { id: _id, ...rest } = r;
    void _id;
    seen.set(k, rest);
  }
  const cleaned = Array.from(seen.values());
  const { error } = await supabase.from(table).upsert(cleaned, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  return cleaned.length;
}

// Remove overlapping weekly rows. A prior export may have written a partial-week
// row (e.g. "May 24–May 26", days=3) for a week this export now completes
// ("May 24–May 30", days=7). Both share a week-start+year and would double-count.
// Keep the row with the most days; delete the rest.
async function dedupeWeekly() {
  const { data: rows, error } = await supabase.from("youtube_weekly").select("id,week,days");
  if (error) throw new Error(`dedupeWeekly read: ${error.message}`);
  const byStart = new Map();
  for (const r of rows) {
    const m = r.week.match(/^(\w+ \d+)–.*?(\d{4})$/);
    if (!m) continue;
    const key = `${m[1]} ${m[2]}`; // start month-day + year
    const arr = byStart.get(key) ?? [];
    arr.push(r);
    byStart.set(key, arr);
  }
  const toDelete = [];
  for (const group of byStart.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => b.days - a.days); // keeper = most days
    for (const r of group.slice(1)) toDelete.push(r.id);
  }
  if (toDelete.length === 0) return 0;
  const { error: delErr } = await supabase.from("youtube_weekly").delete().in("id", toDelete);
  if (delErr) throw new Error(`dedupeWeekly delete: ${delErr.message}`);
  return toDelete.length;
}

// ---- 1. Totals.csv → youtube_weekly (daily → weekly aggregation) ----
const totals = readCsv("Totals.csv");
const ytBuckets = new Map();
for (const r of totals) {
  const d = new Date(r.Date);
  if (isNaN(d.getTime())) continue;
  const weekStart = startOfWeek(d);
  if (weekStart < START_CUTOFF) continue;
  const key = weekStart.toISOString().slice(0, 10);
  const b = ytBuckets.get(key) ?? { dates: [], views: 0, start: weekStart };
  b.dates.push(d);
  b.views += Number(r.Views) || 0;
  ytBuckets.set(key, b);
}
const ytWeekly = [...ytBuckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, b]) => {
  b.dates.sort((a, b) => a - b);
  return {
    week: fmtWeek(b.dates[0], b.dates.at(-1)),
    month: fmtMonth(b.start),
    views: Math.round(b.views),
    days: b.dates.length,
  };
});
console.log(`youtube_weekly: upserting ${ytWeekly.length} weeks (Totals.csv, >= ${START_CUTOFF.toISOString().slice(0,10)})`);
const ytWeeklyInserted = await upsert("youtube_weekly", ytWeekly, "week");
console.log(`  → ${ytWeeklyInserted} rows upserted`);
const ytWeeklyDeduped = await dedupeWeekly();
console.log(`  → ${ytWeeklyDeduped} overlapping weekly row(s) removed`);

// ---- 2. Table data.csv → split by Duration → youtube_videos + shorts_weekly ----
// Filter to videos published on/after START_CUTOFF.
const table = readCsv("Table data.csv").filter((r) => {
  if (!r.Content || r.Content === "Total") return false;
  const pub = r["Video publish time"];
  if (!pub) return false;
  const d = new Date(pub);
  if (isNaN(d.getTime())) return false;
  return d >= START_CUTOFF;
});

const longForm = [];
const shorts = [];
for (const r of table) {
  const dur = Number(r.Duration);
  if (isFinite(dur) && dur > 0 && dur <= SHORTS_MAX) shorts.push(r);
  else longForm.push(r);
}

const ytVideos = longForm
  .filter((r) => r["Video title"] && r["Video title"].trim() !== "")
  .map((r) => ({
    published: r["Video publish time"] || "",
    title: r["Video title"],
    views: Math.round(Number(r.Views) || 0),
    impressions: Math.round(Number(r.Impressions) || 0),
    ctr: Number(r["Impressions click-through rate (%)"]) || 0,
    subs: Math.round(Number(r.Subscribers) || 0),
    note: "",
  }));
console.log(`youtube_videos: upserting ${ytVideos.length} videos (Table data.csv long-form, >= ${START_CUTOFF.toISOString().slice(0,10)})`);
const ytVideosInserted = await upsert("youtube_videos", ytVideos, "title");
console.log(`  → ${ytVideosInserted} rows upserted`);

// Aggregate shorts by publish week (week of publish date).
const shortBuckets = new Map();
for (const r of shorts) {
  const pub = r["Video publish time"];
  if (!pub) continue;
  const d = new Date(pub);
  if (isNaN(d.getTime())) continue;
  const weekStart = startOfWeek(d);
  if (weekStart < START_CUTOFF) continue;
  const key = weekStart.toISOString().slice(0, 10);
  const b = shortBuckets.get(key) ?? { dates: [], views: 0, impressions: 0, clips: new Set(), start: weekStart };
  b.dates.push(d);
  b.views += Number(r.Views) || 0;
  b.impressions += Number(r.Impressions) || 0;
  b.clips.add(r.Content);
  shortBuckets.set(key, b);
}
const shortsRows = [...shortBuckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, b]) => {
  b.dates.sort((a, b) => a - b);
  const clips = b.clips.size;
  const end = new Date(b.start);
  end.setUTCDate(end.getUTCDate() + 6);
  return {
    week: fmtWeek(b.start, end),
    clips,
    total_views: Math.round(b.views),
    avg_per_clip: clips > 0 ? Math.round(b.views / clips) : 0,
    impressions: Math.round(b.impressions),
    note: "",
  };
});
console.log(`shorts_weekly: upserting ${shortsRows.length} weeks (${shorts.length} shorts aggregated by publish week)`);
const shortsInserted = await upsert("shorts_weekly", shortsRows, "week");
console.log(`  → ${shortsInserted} rows upserted`);

// ---- 3. Update youtube_monthly using DAILY → calendar-month aggregation ----
// Weekly buckets are keyed by week-start month (label-friendly), but calendar-month
// totals require splitting per-day so weeks crossing month boundaries don't inflate
// the start-month and starve the next. Aggregate Totals.csv directly here.
const monthByCalendar = new Map();
for (const r of totals) {
  const d = new Date(r.Date);
  if (isNaN(d.getTime())) continue;
  if (d < START_CUTOFF) continue;
  const key = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const b = monthByCalendar.get(key) ?? { views: 0, days: 0 };
  b.views += Number(r.Views) || 0;
  b.days += 1;
  monthByCalendar.set(key, b);
}

const { data: existingMonthly } = await supabase.from("youtube_monthly").select("*");
const existingByMonth = new Map(existingMonthly.map((r) => [r.month, r]));
function monthKey(m) {
  const [name, year] = m.split(" ");
  return parseInt(year) * 12 + MONTHS.indexOf(name);
}

// Determine which months are FULLY covered by this export's daily data.
// Months with fewer days than the calendar month are partial — only update the
// current/latest one (if it's the in-flight month). Skip earlier partial months
// so older accurate values from prior exports aren't overwritten.
function daysInMonth(monthLabel) {
  const [name, year] = monthLabel.split(" ");
  return new Date(Date.UTC(parseInt(year), MONTHS.indexOf(name) + 1, 0)).getUTCDate();
}
const candidates = [...monthByCalendar.entries()].sort(([a], [b]) => monthKey(a) - monthKey(b));
const latestMonth = candidates.length > 0 ? candidates[candidates.length - 1][0] : null;

// Build a map of all months we'll write: existing rows + freshly aggregated ones.
const merged = new Map(existingByMonth);
for (const [month, b] of candidates) {
  const isLatest = month === latestMonth;
  const isFull = b.days >= daysInMonth(month);
  if (!isFull && !isLatest) continue; // skip historical partial months
  const prior = existingByMonth.get(month) ?? {};
  const projected = isFull
    ? null // full month: clear any stale projection
    : b.days > 0
      ? Math.round((b.views / b.days) * daysInMonth(month))
      : null;
  merged.set(month, {
    ...prior,
    month,
    views: b.views,
    days: b.days,
    daily_avg: b.days > 0 ? Math.round(b.views / b.days) : 0,
    note: prior.note ?? "",
    partial: isFull ? 0 : 1,
    projected,
  });
}

// Clear stale projections on any full month that wasn't re-aggregated by this
// export (e.g., a prior partial month is now done but didn't appear in
// `candidates` because the new export starts mid-month).
for (const [month, row] of merged) {
  if (row.partial === 0 && row.projected != null) {
    merged.set(month, { ...row, projected: null });
  }
}

// Recompute MoM across the full chronological series.
const sortedAll = [...merged.values()].sort((a, b) => monthKey(a.month) - monthKey(b.month));
const monthlyRows = sortedAll.map((row, i) => {
  const prev = i > 0 ? sortedAll[i - 1] : null;
  const momPct = prev && prev.views > 0 ? ((row.views - prev.views) / prev.views) * 100 : null;
  return { ...row, mom_pct: momPct !== null ? Math.round(momPct * 10) / 10 : null };
});

console.log(`youtube_monthly: upserting ${monthlyRows.length} months (calendar-month aggregation from Totals.csv)`);
const monthlyInserted = await upsert("youtube_monthly", monthlyRows, "month");
console.log(`  → ${monthlyInserted} rows upserted`);

console.log("\nAll YouTube data updated.");
