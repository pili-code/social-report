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

// Point at an unzipped YouTube Studio "Traffic source type" export folder
// (Advanced mode → dimension "Traffic source type" → Export → CSV).
// Chart data.csv must carry daily rows per source type.
const DIR =
  "/Users/pilitdp/Downloads/Traffic source 2026-03-06_2026-06-04 The Design Project";
const SOURCE = "YouTube search"; // the traffic-source-type row we track
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const chart = parse(fs.readFileSync(path.join(DIR, "Chart data.csv"), "utf8"), {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  relax_column_count: true,
});

// Aggregate search views + distinct day count by calendar month.
const byMonth = new Map();
for (const r of chart) {
  if ((r["Traffic source"] || "") !== SOURCE) continue;
  const d = new Date(r.Date);
  if (isNaN(d.getTime())) continue;
  const key = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  const b = byMonth.get(key) ?? { views: 0, days: new Set(), mi: d.getUTCMonth(), yr: d.getUTCFullYear() };
  b.views += Number(r.Views) || 0;
  b.days.add(r.Date);
  byMonth.set(key, b);
}

const daysInMonth = (yr, mi) => new Date(Date.UTC(yr, mi + 1, 0)).getUTCDate();
const monthKey = (m) => {
  const [name, year] = m.split(" ");
  return parseInt(year) * 12 + MONTHS.indexOf(name);
};

const sorted = [...byMonth.entries()].sort(([a], [b]) => monthKey(a) - monthKey(b));
const rows = sorted.map(([month, b], i) => {
  const days = b.days.size;
  const full = daysInMonth(b.yr, b.mi);
  const partial = days < full ? 1 : 0;
  const dailyAvg = days > 0 ? Math.round(b.views / days) : 0;
  const prev = i > 0 ? sorted[i - 1][1] : null;
  const prevFull = prev ? prev.days.size >= daysInMonth(prev.yr, prev.mi) : false;
  // Only a clean full-month → full-month comparison is meaningful. Comparing a
  // partial boundary month (e.g. Mar 6–31) to a full month distorts the %.
  const mom =
    !partial && prevFull && prev.views > 0
      ? Math.round(((b.views - prev.views) / prev.views) * 1000) / 10
      : null;
  return {
    month,
    views: b.views,
    days,
    daily_avg: dailyAvg,
    mom_pct: mom,
    partial,
    projected: partial ? Math.round(dailyAvg * full) : null,
    note: partial ? `Partial month (${days}/${full} days in export).` : "",
  };
});

console.log(`youtube_search_monthly: upserting ${rows.length} months (source="${SOURCE}")`);
rows.forEach((r) =>
  console.log(
    `  ${r.month}: views=${r.views} days=${r.days} avg=${r.daily_avg} mom=${r.mom_pct ?? "—"}${r.partial ? ` partial (proj ~${r.projected})` : ""}`
  )
);

const { error } = await supabase
  .from("youtube_search_monthly")
  .upsert(rows.map(({ ...r }) => r), { onConflict: "month" });
if (error) throw new Error(`youtube_search_monthly: ${error.message}`);
console.log("\nDone.");
