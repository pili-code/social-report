import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Rebuild youtube_monthly directly from the Totals.csv export, summing by calendar month.
// MoM is computed from daily_avg (not total views) so short months like Feb compare fairly.
const DIR = "/Users/pilitdp/Downloads/Content 2022-04-27_2026-04-22 The Design Project";
const START_CUTOFF = new Date(Date.UTC(2025, 9, 1)); // 2025-10-01

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const daysInMonth = (year, mi) => new Date(year, mi + 1, 0).getDate();

const totals = parse(fs.readFileSync(path.join(DIR, "Totals.csv"), "utf8"), { columns: true, skip_empty_lines: true });

// Sum views by calendar month (YYYY-MM), counting days actually present in the CSV for partial detection.
const buckets = new Map();
for (const r of totals) {
  const d = new Date(r.Date);
  if (isNaN(d.getTime())) continue;
  if (d < START_CUTOFF) continue;
  const key = fmtMonth(d);
  const b = buckets.get(key) ?? { views: 0, days: 0, year: d.getUTCFullYear(), mi: d.getUTCMonth() };
  b.views += Number(r.Views) || 0;
  b.days += 1;
  buckets.set(key, b);
}

function monthOrder(m) {
  const [n, y] = m.split(" ");
  return parseInt(y) * 12 + MONTHS.indexOf(n);
}
const sorted = [...buckets.entries()].sort(([a], [b]) => monthOrder(a) - monthOrder(b));

const { data: existing } = await sb.from("youtube_monthly").select("*");
const priorBy = new Map(existing.map((r) => [r.month, r]));

const rows = sorted.map(([month, b], i) => {
  const expectedDays = daysInMonth(b.year, b.mi);
  const dailyAvg = b.days > 0 ? Math.round(b.views / b.days) : 0;
  const prev = i > 0 ? sorted[i - 1][1] : null;
  const prevDaily = prev && prev.days > 0 ? prev.views / prev.days : 0;
  const momPct = prevDaily > 0 ? ((dailyAvg - prevDaily) / prevDaily) * 100 : null;
  const partial = b.days < expectedDays ? 1 : 0;
  const projected = partial && b.days > 0 ? Math.round(dailyAvg * expectedDays) : null;
  const prior = priorBy.get(month) ?? {};
  return {
    month,
    views: Math.round(b.views),
    days: b.days,
    daily_avg: dailyAvg,
    mom_pct: momPct !== null ? Math.round(momPct * 10) / 10 : null,
    note: prior.note ?? "",
    partial,
    projected,
  };
});

console.log(`rebuilding youtube_monthly: ${rows.length} months (calendar-month sums from Totals.csv)`);
rows.forEach((r) => console.log(`  ${r.month}: views=${r.views}, days=${r.days}, daily=${r.daily_avg}, MoM=${r.mom_pct}%, partial=${r.partial}, proj=${r.projected}`));

await sb.from("youtube_monthly").delete().neq("id", -1);
const { error } = await sb.from("youtube_monthly").insert(rows);
if (error) { console.error("insert failed:", error.message); process.exit(1); }
console.log("Done.");
