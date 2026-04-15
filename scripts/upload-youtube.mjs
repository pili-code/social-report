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

const DIR = "/Users/pilitdp/Downloads/Content 2026-01-15_2026-04-15 The Design Project";
const SHORTS_MAX = 180;

function readCsv(file) {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true });
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const fmtMonth = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
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
    seen.set(k, r);
  }
  const cleaned = Array.from(seen.values());
  const { error } = await supabase.from(table).upsert(cleaned, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  return cleaned.length;
}

// ---- 1. Totals.csv → youtube_weekly (daily → weekly aggregation) ----
const totals = readCsv("Totals.csv");
const ytBuckets = new Map();
for (const r of totals) {
  const d = new Date(r.Date);
  if (isNaN(d.getTime())) continue;
  const key = startOfWeek(d).toISOString().slice(0, 10);
  const b = ytBuckets.get(key) ?? { dates: [], views: 0 };
  b.dates.push(d);
  b.views += Number(r.Views) || 0;
  ytBuckets.set(key, b);
}
const ytWeekly = [...ytBuckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, b]) => {
  b.dates.sort((a, b) => a - b);
  return {
    week: `${fmtDay(b.dates[0])}–${fmtDay(b.dates.at(-1))}`,
    month: fmtMonth(b.dates[0]),
    views: Math.round(b.views),
    days: b.dates.length,
  };
});
console.log(`youtube_weekly: upserting ${ytWeekly.length} weeks (Totals.csv)`);
const ytWeeklyInserted = await upsert("youtube_weekly", ytWeekly, "week");
console.log(`  → ${ytWeeklyInserted} rows upserted`);

// ---- 2. Table data.csv → split by Duration → youtube_videos + shorts_weekly ----
const table = readCsv("Table data.csv").filter((r) => r.Content && r.Content !== "Total");

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
console.log(`youtube_videos: upserting ${ytVideos.length} videos (Table data.csv long-form)`);
const ytVideosInserted = await upsert("youtube_videos", ytVideos, "title");
console.log(`  → ${ytVideosInserted} rows upserted`);

// Aggregate shorts by publish week
const shortBuckets = new Map();
for (const r of shorts) {
  const pub = r["Video publish time"];
  if (!pub) continue;
  const d = new Date(pub);
  if (isNaN(d.getTime())) continue;
  const key = startOfWeek(d).toISOString().slice(0, 10);
  const b = shortBuckets.get(key) ?? { dates: [], views: 0, impressions: 0, clips: new Set() };
  b.dates.push(d);
  b.views += Number(r.Views) || 0;
  b.impressions += Number(r.Impressions) || 0;
  b.clips.add(r.Content);
  shortBuckets.set(key, b);
}
const shortsRows = [...shortBuckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, b]) => {
  b.dates.sort((a, b) => a - b);
  const clips = b.clips.size;
  return {
    week: `${fmtDay(b.dates[0])}–${fmtDay(b.dates.at(-1))}`,
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

// ---- 3. Rebuild youtube_monthly from updated youtube_weekly ----
const { data: allWeekly } = await supabase.from("youtube_weekly").select("*");
const { data: existingMonthly } = await supabase.from("youtube_monthly").select("*");
const existingByMonth = new Map(existingMonthly.map((r) => [r.month, r]));

const monthBuckets = new Map();
for (const w of allWeekly) {
  const m = String(w.month ?? "").trim();
  if (!m) continue;
  const b = monthBuckets.get(m) ?? { views: 0, days: 0 };
  b.views += Number(w.views) || 0;
  b.days += Number(w.days) || 0;
  monthBuckets.set(m, b);
}
function monthKey(m) {
  const [name, year] = m.split(" ");
  return parseInt(year) * 12 + MONTHS.indexOf(name);
}
const sortedMonths = [...monthBuckets.entries()].sort(([a], [b]) => monthKey(a) - monthKey(b));
const monthlyRows = sortedMonths.map(([month, b], i) => {
  const prev = i > 0 ? sortedMonths[i - 1][1] : null;
  const momPct = prev && prev.views > 0 ? ((b.views - prev.views) / prev.views) * 100 : null;
  const prior = existingByMonth.get(month) ?? {};
  return {
    month,
    views: b.views,
    days: b.days,
    daily_avg: b.days > 0 ? Math.round(b.views / b.days) : 0,
    mom_pct: momPct !== null ? Math.round(momPct * 10) / 10 : null,
    note: prior.note ?? "",
    partial: prior.partial ?? 0,
    projected: prior.projected ?? null,
  };
});
console.log(`youtube_monthly: rebuilding ${monthlyRows.length} months from weekly data`);
const monthlyInserted = await upsert("youtube_monthly", monthlyRows, "month");
console.log(`  → ${monthlyInserted} rows upserted`);

console.log("\nAll YouTube data updated.");
