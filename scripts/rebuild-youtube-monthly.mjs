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

const { data: weekly } = await sb.from("youtube_weekly").select("*");
const { data: existing } = await sb.from("youtube_monthly").select("*");
const priorBy = new Map(existing.map((r) => [r.month, r]));

// Parse week string like "Dec 28–Jan 3" or "Dec 28–Jan 3, 2025" → start/end dates
function parseWeekRange(week, monthHint) {
  const raw = week.trim();
  const yearMatch = raw.match(/,\s*(\d{4})\s*$/);
  const clean = yearMatch ? raw.slice(0, -yearMatch[0].length).trim() : raw;
  const parts = clean.split("–").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const [leftStr, rightStr] = parts;
  const [hintName, hintYear] = (monthHint || "").split(" ");
  const year = yearMatch ? parseInt(yearMatch[1]) : (parseInt(hintYear) || new Date().getFullYear());

  const leftMatch = leftStr.match(/^(\w{3})\s+(\d+)$/);
  const rightMatch = rightStr.match(/^(\w{3})\s+(\d+)$/);
  if (!leftMatch || !rightMatch) return null;

  const leftMi = MONTHS.indexOf(leftMatch[1]);
  const rightMi = MONTHS.indexOf(rightMatch[1]);
  if (leftMi < 0 || rightMi < 0) return null;

  // Determine years: if week is cross-month and crosses Dec→Jan, right side is next year
  const leftYear = year;
  let rightYear = year;
  if (leftMi === 11 && rightMi === 0) rightYear = year + 1; // Dec → Jan

  const start = new Date(Date.UTC(leftYear, leftMi, parseInt(leftMatch[2])));
  const end = new Date(Date.UTC(rightYear, rightMi, parseInt(rightMatch[2])));
  return { start, end };
}

function daysByMonth(start, end) {
  // Returns a map of "Mon YYYY" → number of days in that month covered by [start, end]
  const byMonth = new Map();
  const d = new Date(start);
  while (d <= end) {
    const key = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return byMonth;
}

const buckets = new Map();
for (const w of weekly) {
  const hintMonth = String(w.month ?? "").trim();
  if (!/\s\d{4}$/.test(hintMonth)) continue;
  const range = parseWeekRange(w.week, hintMonth);
  if (!range) {
    // Single-day rows or odd formats — assign to the hint month
    const b = buckets.get(hintMonth) ?? { views: 0, days: 0 };
    b.views += Number(w.views) || 0;
    b.days += Number(w.days) || 0;
    buckets.set(hintMonth, b);
    continue;
  }
  const byM = daysByMonth(range.start, range.end);
  const totalDays = [...byM.values()].reduce((s, n) => s + n, 0);
  const views = Number(w.views) || 0;
  const weekDays = Number(w.days) || totalDays;
  for (const [monthKey, daysInThisMonth] of byM) {
    const share = daysInThisMonth / totalDays;
    const b = buckets.get(monthKey) ?? { views: 0, days: 0 };
    b.views += Math.round(views * share);
    b.days += Math.round(weekDays * share);
    buckets.set(monthKey, b);
  }
}

function monthKey(m) {
  const [n, y] = m.split(" ");
  return parseInt(y) * 12 + MONTHS.indexOf(n);
}
const sorted = [...buckets.entries()].sort(([a], [b]) => monthKey(a) - monthKey(b));

// Compute days-in-month for partial detection
function daysInMonth(monthStr) {
  const [n, y] = monthStr.split(" ");
  const mi = MONTHS.indexOf(n);
  const yi = parseInt(y);
  return new Date(yi, mi + 1, 0).getDate();
}

const rows = sorted.map(([month, b], i) => {
  const prev = i > 0 ? sorted[i - 1][1] : null;
  const momPct = prev && prev.views > 0 ? ((b.views - prev.views) / prev.views) * 100 : null;
  const prior = priorBy.get(month) ?? {};
  const expectedDays = daysInMonth(month);
  const partial = b.days < expectedDays ? 1 : 0;
  const projected = partial && b.days > 0 ? Math.round((b.views / b.days) * expectedDays) : null;
  return {
    month,
    views: b.views,
    days: b.days,
    daily_avg: b.days > 0 ? Math.round(b.views / b.days) : 0,
    mom_pct: momPct !== null ? Math.round(momPct * 10) / 10 : null,
    note: prior.note ?? "",
    partial,
    projected,
  };
});

console.log(`rebuilding youtube_monthly: ${rows.length} months`);
rows.forEach((r) => console.log(`  ${r.month}: views=${r.views}, days=${r.days}, daily_avg=${r.daily_avg}, MoM=${r.mom_pct}%, partial=${r.partial}, projected=${r.projected}`));

// Delete existing and insert fresh (simpler than upsert with potential schema drift)
await sb.from("youtube_monthly").delete().neq("id", -1);
const { error } = await sb.from("youtube_monthly").insert(rows);
if (error) { console.error("insert failed:", error.message); process.exit(1); }
console.log("Done.");
