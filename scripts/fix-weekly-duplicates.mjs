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

// For month-only strings like "Dec", infer year from context (Dec 2025, Jan-Apr 2026)
function normalizeMonth(month) {
  const parts = month.trim().split(/\s+/);
  if (parts.length === 2 && /^\d{4}$/.test(parts[1])) return month.trim();
  const name = parts[0];
  if (name === "Dec") return "Dec 2025";
  if (["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov"].includes(name)) return `${name} 2026`;
  return month;
}

// Normalize week string: "Dec 7–13" → "Dec 7–Dec 13"
// Handle both en-dash (–) and hyphen (-)
function normalizeWeek(week) {
  const cleaned = week.trim().replace(/-/g, "–");
  const parts = cleaned.split("–").map((s) => s.trim());
  if (parts.length !== 2) return cleaned;
  const [left, right] = parts;
  const leftMatch = left.match(/^(\w+)\s+(\d+)$/);
  const rightMatch = right.match(/^(\w+)\s+(\d+)$/);
  if (leftMatch && !rightMatch) {
    // "Dec 7–13" — right side has just a day number
    const dayNum = parseInt(right);
    if (!isNaN(dayNum)) {
      return `${leftMatch[1]} ${leftMatch[2]}–${leftMatch[1]} ${dayNum}`;
    }
  }
  return cleaned;
}

const { data: rows } = await sb.from("youtube_weekly").select("*").order("id");
console.log(`Before: ${rows.length} rows`);

// Build normalized map: canonical week label → best row
const byWeek = new Map();
for (const r of rows) {
  const normalizedWeek = normalizeWeek(r.week);
  const normalizedMonth = normalizeMonth(r.month);
  const existing = byWeek.get(normalizedWeek);
  // If duplicate: prefer the one with higher id (more recent) and more data (7 days > 1 day)
  if (!existing || (r.days >= existing.days && r.id > existing.id)) {
    byWeek.set(normalizedWeek, {
      id: r.id,
      originalWeek: r.week,
      originalMonth: r.month,
      week: normalizedWeek,
      month: normalizedMonth,
      views: r.views,
      days: r.days,
    });
  }
}

// Collect rows to DELETE (all the others)
const keepIds = new Set([...byWeek.values()].map((r) => r.id));
const deleteIds = rows.filter((r) => !keepIds.has(r.id)).map((r) => r.id);

console.log(`\nTo keep: ${keepIds.size} rows`);
console.log(`To delete: ${deleteIds.length} rows`);

// Step 1: delete duplicates
if (deleteIds.length > 0) {
  const { error } = await sb.from("youtube_weekly").delete().in("id", deleteIds);
  if (error) throw error;
  console.log(`Deleted ${deleteIds.length} duplicate rows`);
}

// Step 2: update remaining rows with normalized labels
for (const row of byWeek.values()) {
  if (row.originalWeek !== row.week || row.originalMonth !== row.month) {
    const { error } = await sb.from("youtube_weekly").update({
      week: row.week,
      month: row.month,
    }).eq("id", row.id);
    if (error) {
      console.error(`Update failed for id=${row.id}:`, error.message);
    } else {
      console.log(`Updated id=${row.id}: '${row.originalWeek}' → '${row.week}', '${row.originalMonth}' → '${row.month}'`);
    }
  }
}

const { data: after } = await sb.from("youtube_weekly").select("*").order("id");
console.log(`\nAfter: ${after.length} rows`);
after.forEach((r) => console.log(`  ${r.week} | ${r.month} | views=${r.views} | days=${r.days}`));
