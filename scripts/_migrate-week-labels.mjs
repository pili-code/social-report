import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Upgrade legacy week labels.
// Handles: "Dec 7–13", "Mar 22–28", "Mar 29–Apr 4", "Apr 5–Apr 11"
// Output: "Dec 7–Dec 13, 2025", "Mar 29–Apr 4, 2026", etc.
// Year inference: compare week-start month to current month (Apr 2026) — if month > current, prev year.
function normalizeWeekLabel(week) {
  if (!week) return null;
  if (/,\s*\d{4}\s*$/.test(week)) return week; // already has year
  const parts = week.split("–").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const [leftStr, rightStr] = parts;
  const leftMatch = leftStr.match(/^(\w{3})\s+(\d+)$/);
  if (!leftMatch) return null;
  const leftMonth = leftMatch[1];
  const leftDay = parseInt(leftMatch[2]);
  const leftMi = MONTHS.indexOf(leftMonth);
  if (leftMi < 0) return null;

  // Right may be "Jan 3" (full) or "13" (just number → same month as left).
  let rightMonth, rightDay;
  const rightFull = rightStr.match(/^(\w{3})\s+(\d+)$/);
  const rightNumOnly = rightStr.match(/^(\d+)$/);
  if (rightFull) {
    rightMonth = rightFull[1];
    rightDay = parseInt(rightFull[2]);
  } else if (rightNumOnly) {
    rightMonth = leftMonth;
    rightDay = parseInt(rightNumOnly[1]);
  } else {
    return null;
  }

  // Year inference: for historical data we're in Apr 2026; earlier weeks in Oct-Dec → 2025, Jan-Apr → 2026.
  const year = leftMi >= 9 ? 2025 : 2026; // Oct(9), Nov(10), Dec(11) = 2025; Jan-Sep = 2026 for this dataset
  return `${leftMonth} ${leftDay}–${rightMonth} ${rightDay}, ${year}`;
}

// Also normalize post.date field: "Dec 1" → "2025-12-01", "Feb 16+19" → "2026-02-16", keep ISO as-is.
function normalizeDate(dateStr) {
  if (!dateStr) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr; // already ISO
  // Take the first "MMM DD" token (drop any "+DD" extras, punctuation, etc.)
  const m = String(dateStr).match(/^(\w{3})\s+(\d+)/);
  if (!m) return dateStr;
  const mi = MONTHS.indexOf(m[1]);
  if (mi < 0) return dateStr;
  const day = parseInt(m[2]);
  const year = mi >= 9 ? 2025 : 2026;
  return `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function migrateTable(table, extraFields = []) {
  const { data, error } = await sb.from(table).select("*");
  if (error) throw new Error(`${table} select: ${error.message}`);
  let updated = 0;
  for (const row of data) {
    const newWeek = normalizeWeekLabel(row.week);
    const updates = {};
    if (newWeek && newWeek !== row.week) updates.week = newWeek;
    for (const f of extraFields) {
      if (f === "date" && row.date) {
        const nd = normalizeDate(row.date);
        if (nd !== row.date) updates.date = nd;
      }
    }
    if (Object.keys(updates).length === 0) continue;
    const { error: uerr } = await sb.from(table).update(updates).eq("id", row.id);
    if (uerr) {
      console.error(`  ${table} id=${row.id} update failed: ${uerr.message}`);
      continue;
    }
    console.log(`  ${table} id=${row.id}: ${JSON.stringify(row.week)} → ${JSON.stringify(updates.week ?? row.week)}${updates.date ? `, date ${row.date} → ${updates.date}` : ""}`);
    updated++;
  }
  console.log(`${table}: updated ${updated}/${data.length} rows\n`);
}

await migrateTable("linkedin_dianne_posts", ["date"]);
// twitter_weekly will be fully replaced from the fresh CSV — skip migration.
