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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
function startOfWeek(d) {
  const o = new Date(d);
  o.setUTCDate(o.getUTCDate() - o.getUTCDay());
  o.setUTCHours(0, 0, 0, 0);
  return o;
}
function weekLabel(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setUTCDate(e.getUTCDate() + 6);
  return `${fmtDay(s)}–${fmtDay(e)}`;
}
function toNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  return Number(String(v).replace(/,/g, "")) || 0;
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

// ---- Dianne individual post analytics ----
function parseDiannePost(file) {
  const wb = XLSX.read(fs.readFileSync(file));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["PERFORMANCE"], { header: 1, raw: false, defval: null });
  const kv = new Map();
  for (const r of rows) if (r?.[0]) kv.set(String(r[0]).trim(), r[1]);
  const dateStr = kv.get("Post Date");
  const time = kv.get("Post Publish Time") ?? "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    console.warn(`Could not parse date "${dateStr}" in ${path.basename(file)}`);
    return null;
  }
  return {
    week: weekLabel(d),
    date: d.toISOString().slice(0, 10),
    post_time: String(time).trim(),
    impressions: toNum(kv.get("Impressions")),
    reactions: toNum(kv.get("Reactions")),
    comments: toNum(kv.get("Comments")),
    reposts: toNum(kv.get("Reposts")),
    saves: toNum(kv.get("Saves")),
    followers: toNum(kv.get("Followers gained from this post")),
    note: "",
  };
}

const dianneFiles = [
  "/Users/pilitdp/Downloads/PostAnalytics_DianneAlter_7445191940180049920 (1).xlsx",
  "/Users/pilitdp/Downloads/PostAnalytics_DianneAlter_7447986518108917760.xlsx",
];

const diannePosts = [];
for (const f of dianneFiles) {
  const row = parseDiannePost(f);
  if (row) {
    console.log(`Dianne post: ${row.date} ${row.post_time} — impressions=${row.impressions}, reactions=${row.reactions}, comments=${row.comments}`);
    diannePosts.push(row);
  }
}
const diannePostsUpserted = await upsert("linkedin_dianne_posts", diannePosts, "week,date");
console.log(`linkedin_dianne_posts: ${diannePostsUpserted} rows upserted\n`);

// ---- TDP Page content metrics ----
// Sheet "Metrics" has daily impressions/engagements — aggregate to weekly
const tdpFile = "/Users/pilitdp/Downloads/thedesignproject_content_1776281243413.xls";
const tdpWb = XLSX.read(fs.readFileSync(tdpFile));
const metricsRaw = XLSX.utils.sheet_to_json(tdpWb.Sheets["Metrics"], { header: 1, raw: false, defval: null });

// First row is description, second row is headers, rest is data
const tdpHeaderIdx = metricsRaw.findIndex((r) => r?.[0] === "Date");
const tdpHeaders = metricsRaw[tdpHeaderIdx];
const tdpData = metricsRaw.slice(tdpHeaderIdx + 1).filter((r) => r?.[0]);

console.log("TDP Page Metrics headers:", tdpHeaders);

// Prefer "total" columns over organic-only
const colExact = (name) => tdpHeaders.findIndex((h) => h && String(h).trim() === name);
const iDate = tdpHeaders.findIndex((h) => h && String(h).toLowerCase() === "date");
const iImp = colExact("Impressions (total)");
const iClicks = colExact("Clicks (total)");
const iReactions = colExact("Reactions (total)");

// Group daily → weekly
const tdpBuckets = new Map();
for (const r of tdpData) {
  const d = new Date(r[iDate]);
  if (isNaN(d.getTime())) continue;
  const wk = weekLabel(d);
  const b = tdpBuckets.get(wk) ?? { impressions: 0, clicks: 0, reactions: 0, days: 0 };
  if (iImp >= 0) b.impressions += toNum(r[iImp]);
  if (iClicks >= 0) b.clicks += toNum(r[iClicks]);
  if (iReactions >= 0) b.reactions += toNum(r[iReactions]);
  b.days += 1;
  tdpBuckets.set(wk, b);
}

const tdpRows = [...tdpBuckets.entries()].map(([week, b]) => ({
  week,
  impressions: b.impressions,
  clicks: b.clicks,
  ctr: b.impressions > 0 ? Math.round((b.clicks / b.impressions) * 10000) / 100 : 0,
  reactions: b.reactions,
  note: "",
}));
console.log(`\nTDP Page weeks: ${tdpRows.length}`);
tdpRows.forEach((r) => console.log(`  ${r.week}: imp=${r.impressions}, clicks=${r.clicks}, react=${r.reactions}`));
const tdpUpserted = await upsert("linkedin_tdp_weekly", tdpRows, "week");
console.log(`linkedin_tdp_weekly: ${tdpUpserted} rows upserted`);

console.log("\nLinkedIn data updated.");
