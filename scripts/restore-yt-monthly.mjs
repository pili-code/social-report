import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Authoritative historical values from YouTube Studio (from original gtm-data.json seed)
const HISTORICAL = [
  { month: "Dec 2025", views: 51268, days: 31, daily_avg: 1654, mom_pct: null, note: "Baseline", partial: 0, projected: null },
  { month: "Jan 2026", views: 86440, days: 31, daily_avg: 2788, mom_pct: 68.6, note: "Design System video compounding", partial: 0, projected: null },
  { month: "Feb 2026", views: 84193, days: 28, daily_avg: 3007, mom_pct: 7.8, note: "Daily avg grew despite raw dip (3 fewer days)", partial: 0, projected: null },
  { month: "Mar 2026", views: 119474, days: 31, daily_avg: 3854, mom_pct: 28.2, note: "Best month ever — 4 long-form videos", partial: 0, projected: null },
];

// Compute Apr 2026 from current weekly data with proportional cross-month split
function parseWeekRange(week, monthHint) {
  const parts = week.trim().split("–").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const [left, right] = parts;
  const [hintName, hintYear] = (monthHint || "").split(" ");
  const year = parseInt(hintYear) || new Date().getFullYear();
  const lm = left.match(/^(\w{3})\s+(\d+)$/);
  const rm = right.match(/^(\w{3})\s+(\d+)$/);
  if (!lm || !rm) return null;
  const li = MONTHS.indexOf(lm[1]);
  const ri = MONTHS.indexOf(rm[1]);
  if (li < 0 || ri < 0) return null;
  let ry = year;
  if (li === 11 && ri === 0) ry = year + 1;
  return {
    start: new Date(Date.UTC(year, li, parseInt(lm[2]))),
    end: new Date(Date.UTC(ry, ri, parseInt(rm[2]))),
  };
}
function daysByMonth(start, end) {
  const byMonth = new Map();
  const d = new Date(start);
  while (d <= end) {
    const key = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return byMonth;
}
function daysInMonth(monthStr) {
  const [n, y] = monthStr.split(" ");
  return new Date(parseInt(y), MONTHS.indexOf(n) + 1, 0).getDate();
}

const { data: weekly } = await sb.from("youtube_weekly").select("*");
const aprBucket = { views: 0, days: 0 };
for (const w of weekly) {
  if (!w.month) continue;
  const range = parseWeekRange(w.week, w.month);
  if (!range) continue;
  const byM = daysByMonth(range.start, range.end);
  const totalDays = [...byM.values()].reduce((s, n) => s + n, 0);
  const aprDays = byM.get("Apr 2026") ?? 0;
  if (aprDays > 0) {
    const share = aprDays / totalDays;
    aprBucket.views += Math.round((Number(w.views) || 0) * share);
    aprBucket.days += aprDays;
  }
}

const marDaily = 3854;
const aprDailyAvg = aprBucket.days > 0 ? Math.round(aprBucket.views / aprBucket.days) : 0;
const aprMoM = Math.round(((aprDailyAvg - marDaily) / marDaily) * 1000) / 10;
const aprDIM = daysInMonth("Apr 2026");
const aprProjected = aprDailyAvg > 0 ? aprDailyAvg * aprDIM : null;

const aprRow = {
  month: "Apr 2026",
  views: aprBucket.views,
  days: aprBucket.days,
  daily_avg: aprDailyAvg,
  mom_pct: aprMoM,
  note: `Apr 1–${aprBucket.days} only (partial)`,
  partial: 1,
  projected: aprProjected,
};

console.log("Apr 2026 computed:", aprRow);

const allRows = [...HISTORICAL, aprRow];

// Delete all and re-insert
await sb.from("youtube_monthly").delete().neq("id", -1);
const { error } = await sb.from("youtube_monthly").insert(allRows);
if (error) { console.error(error.message); process.exit(1); }

console.log(`\nRestored ${allRows.length} rows in youtube_monthly`);
allRows.forEach((r) => console.log(`  ${r.month}: ${r.views} views, ${r.days} days, ${r.daily_avg}/day, MoM=${r.mom_pct ?? "—"}%, partial=${r.partial}`));
