import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Single 365-day TDP Page export (Apr 21 2025 → Apr 20 2026).
const TDP_FILE = "/Users/pilitdp/Downloads/thedesignproject_content_1779897256788.xls";
// Only keep weeks whose START is on or after this date.
const START_CUTOFF = new Date(Date.UTC(2025, 9, 1)); // 2025-10-01

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const fmtWeek = (start, end) => `${fmtDay(start)}–${fmtDay(end)}, ${start.getUTCFullYear()}`;
function startOfWeek(d) {
  const o = new Date(d);
  o.setUTCDate(o.getUTCDate() - o.getUTCDay());
  o.setUTCHours(0, 0, 0, 0);
  return o;
}
function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  return Number(String(v).replace(/,/g, "")) || 0;
}

// 1. Wipe existing TDP rows (they use year-less labels — replace with year-labeled format).
{
  const { error, count } = await supabase.from("linkedin_tdp_weekly").delete({ count: "exact" }).neq("id", -1);
  if (error) { console.error(`cleanup failed: ${error.message}`); process.exit(1); }
  console.log(`linkedin_tdp_weekly: deleted ${count ?? "?"} existing rows`);
}

// 2. Parse the Metrics sheet.
const wb = XLSX.read(fs.readFileSync(TDP_FILE));
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Metrics"], { header: 1, raw: false, defval: null });
const headerIdx = rows.findIndex((r) => r?.[0] === "Date");
const headers = rows[headerIdx];
const data = rows.slice(headerIdx + 1).filter((r) => r?.[0]);

const colExact = (name) => headers.findIndex((h) => h && String(h).trim() === name);
const iDate = headers.findIndex((h) => h && String(h).toLowerCase() === "date");
const iImp = colExact("Impressions (total)");
const iClicks = colExact("Clicks (total)");
const iReactions = colExact("Reactions (total)");

// 3. Group daily → weekly, filter by cutoff.
const tdpBuckets = new Map();
for (const r of data) {
  const d = new Date(r[iDate]);
  if (isNaN(d.getTime())) continue;
  const weekStart = startOfWeek(d);
  if (weekStart < START_CUTOFF) continue;
  const key = weekStart.toISOString().slice(0, 10);
  const b = tdpBuckets.get(key) ?? { impressions: 0, clicks: 0, reactions: 0, start: weekStart, dates: [] };
  if (iImp >= 0) b.impressions += toNum(r[iImp]);
  if (iClicks >= 0) b.clicks += toNum(r[iClicks]);
  if (iReactions >= 0) b.reactions += toNum(r[iReactions]);
  b.dates.push(d);
  tdpBuckets.set(key, b);
}

const tdpRows = [...tdpBuckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, b]) => {
  b.dates.sort((a, b) => a - b);
  return {
    week: fmtWeek(b.dates[0], b.dates.at(-1)),
    impressions: b.impressions,
    clicks: b.clicks,
    ctr: b.impressions > 0 ? Math.round((b.clicks / b.impressions) * 10000) / 100 : 0,
    reactions: b.reactions,
    note: "",
  };
});

console.log(`\nTDP Page weeks (>= ${START_CUTOFF.toISOString().slice(0,10)}): ${tdpRows.length}`);
tdpRows.forEach((r) => console.log(`  ${r.week}: imp=${r.impressions}, clicks=${r.clicks}, react=${r.reactions}, ctr=${r.ctr}%`));

const { error } = await supabase.from("linkedin_tdp_weekly").insert(tdpRows);
if (error) { console.error(`insert failed: ${error.message}`); process.exit(1); }
console.log(`\nlinkedin_tdp_weekly: ${tdpRows.length} rows inserted`);
