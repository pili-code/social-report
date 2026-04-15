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
const toNum = (v) => Number(String(v ?? "").replace(/,/g, "")) || 0;

const raw = fs.readFileSync("/Users/pilitdp/Downloads/account_overview_analytics.csv", "utf8");
const rows = parse(raw, { columns: true, skip_empty_lines: true });

// Aggregate daily → weekly
const buckets = new Map();
for (const r of rows) {
  const d = new Date(r.Date);
  if (isNaN(d.getTime())) continue;
  const wk = weekLabel(d);
  const b = buckets.get(wk) ?? {
    impressions: 0, likes: 0, engagements: 0, bookmarks: 0, shares: 0,
    follows: 0, unfollows: 0, replies: 0, reposts: 0,
    profile_visits: 0, video_views: 0,
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
  buckets.set(wk, b);
}

const weekly = [...buckets.entries()].map(([week, b]) => ({
  week, note: "", ...b,
}));

console.log(`twitter_weekly: ${weekly.length} weeks aggregated from ${rows.length} daily rows`);
weekly.forEach((r) => console.log(`  ${r.week}: imp=${r.impressions}, eng=${r.engagements}, follows=${r.follows - r.unfollows}`));

const { error } = await supabase.from("twitter_weekly").upsert(weekly, { onConflict: "week" });
if (error) {
  console.error("FAILED:", error.message);
  console.error("Did you run the CREATE TABLE SQL in Supabase?");
  process.exit(1);
}
console.log(`\n${weekly.length} rows upserted.`);
