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

const CSV_FILE = "/Users/pilitdp/Downloads/account_overview_analytics (3).csv";
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
const toNum = (v) => Number(String(v ?? "").replace(/,/g, "")) || 0;

// Wipe existing (year-less labels replaced by year-labeled format).
{
  const { error, count } = await supabase.from("twitter_weekly").delete({ count: "exact" }).neq("id", -1);
  if (error) { console.error(`cleanup failed: ${error.message}`); process.exit(1); }
  console.log(`twitter_weekly: deleted ${count ?? "?"} existing rows`);
}

const raw = fs.readFileSync(CSV_FILE, "utf8");
const rows = parse(raw, { columns: true, skip_empty_lines: true });

// Aggregate daily → weekly with Oct 1 2025 cutoff.
const buckets = new Map();
for (const r of rows) {
  const d = new Date(r.Date);
  if (isNaN(d.getTime())) continue;
  const weekStart = startOfWeek(d);
  if (weekStart < START_CUTOFF) continue;
  const key = weekStart.toISOString().slice(0, 10);
  const b = buckets.get(key) ?? {
    impressions: 0, likes: 0, engagements: 0, bookmarks: 0, shares: 0,
    follows: 0, unfollows: 0, replies: 0, reposts: 0,
    profile_visits: 0, video_views: 0,
    start: weekStart, dates: [],
  };
  b.impressions += toNum(r.Impressions);
  b.likes += toNum(r.Likes);
  b.engagements += toNum(r.Engagements);
  b.bookmarks += toNum(r.Bookmarks);
  b.shares += toNum(r.Shares);
  b.follows += toNum(r["New follows"]);
  b.unfollows += toNum(r.Unfollows);
  b.replies += toNum(r.Replies);
  b.reposts += toNum(r.Reposts);
  b.profile_visits += toNum(r["Profile visits"]);
  b.video_views += toNum(r["Video views"]);
  b.dates.push(d);
  buckets.set(key, b);
}

const weekly = [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, b]) => {
  b.dates.sort((a, b) => a - b);
  const { start, dates, ...metrics } = b;
  return {
    week: fmtWeek(b.dates[0], b.dates.at(-1)),
    note: "",
    ...metrics,
  };
});

console.log(`\ntwitter_weekly: ${weekly.length} weeks aggregated (>= ${START_CUTOFF.toISOString().slice(0,10)}) from ${rows.length} daily rows`);
weekly.forEach((r) => console.log(`  ${r.week}: imp=${r.impressions}, eng=${r.engagements}, follows=${r.follows - r.unfollows}`));

const { error } = await supabase.from("twitter_weekly").insert(weekly);
if (error) {
  console.error("FAILED:", error.message);
  console.error("Did you run the CREATE TABLE SQL in Supabase?");
  process.exit(1);
}
console.log(`\n${weekly.length} rows inserted.`);
