// One-off: restore twitter_weekly from the May 13 export (full history back to May 2025)
// merged with today's May 20 export (latest 14 days). Today's data overrides where overlap.
//
// Why: upload-twitter.mjs wipes and rebuilds from the single CSV passed to it. When today's
// CSV was only 14 days, the prior 25 weeks of weekly aggregates were lost. This rebuilds them
// by merging the two daily-row CSVs at day granularity, then aggregating by Sun→Sat week.

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

const OLDER = "/Users/pilitdp/Downloads/account_overview_analytics (2).csv"; // May 13: history back to May 2025
const NEWER = "/Users/pilitdp/Downloads/account_overview_analytics (3).csv"; // May 20: latest 14 days
const START_CUTOFF = new Date(Date.UTC(2025, 9, 1)); // 2025-10-01

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const fmtWeek = (s, e) => `${fmtDay(s)}–${fmtDay(e)}, ${s.getUTCFullYear()}`;
function startOfWeek(d) {
  const o = new Date(d);
  o.setUTCDate(o.getUTCDate() - o.getUTCDay());
  o.setUTCHours(0,0,0,0);
  return o;
}
const toNum = (v) => v == null || v === "" ? 0 : Number(String(v).replace(/,/g, "")) || 0;

function readDaily(file) {
  const raw = fs.readFileSync(file, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  const out = new Map(); // dateISO → row
  for (const r of rows) {
    // Date format: "Wed, May 13, 2026"
    const d = new Date(r.Date);
    if (isNaN(d.getTime())) continue;
    const iso = d.toISOString().slice(0, 10);
    out.set(iso, {
      date: iso, d,
      impressions: toNum(r.Impressions),
      likes: toNum(r.Likes),
      engagements: toNum(r.Engagements),
      bookmarks: toNum(r.Bookmarks),
      shares: toNum(r.Shares),
      follows: toNum(r["New follows"]),
      unfollows: toNum(r.Unfollows),
      replies: toNum(r.Replies),
      reposts: toNum(r.Reposts),
      profile_visits: toNum(r["Profile visits"]),
      video_views: toNum(r["Video views"]),
    });
  }
  return out;
}

const older = readDaily(OLDER);
const newer = readDaily(NEWER);
console.log(`older=${older.size} daily rows, newer=${newer.size} daily rows`);

// Merge: newer overrides older
const merged = new Map(older);
for (const [k, v] of newer) merged.set(k, v);
console.log(`merged=${merged.size} unique daily rows`);

// Aggregate by Sun→Sat week
const weeks = new Map();
for (const r of merged.values()) {
  if (r.d < START_CUTOFF) continue;
  const ws = startOfWeek(r.d);
  const we = new Date(ws); we.setUTCDate(ws.getUTCDate() + 6);
  const key = fmtWeek(ws, we);
  let w = weeks.get(key);
  if (!w) {
    w = { week: key, weekStart: ws, impressions: 0, likes: 0, engagements: 0, bookmarks: 0, shares: 0,
          follows: 0, unfollows: 0, replies: 0, reposts: 0, profile_visits: 0, video_views: 0, note: "" };
    weeks.set(key, w);
  }
  for (const k of ["impressions","likes","engagements","bookmarks","shares","follows","unfollows","replies","reposts","profile_visits","video_views"]) {
    w[k] += r[k];
  }
}

const rows = [...weeks.values()].sort((a, b) => a.weekStart - b.weekStart).map(({ weekStart, ...r }) => { void weekStart; return r; });
console.log(`\n${rows.length} weeks aggregated (>= ${START_CUTOFF.toISOString().slice(0,10)})`);
rows.forEach((w) => console.log(`  ${w.week}: imp=${w.impressions}, eng=${w.engagements}, follows=${w.follows-w.unfollows}`));

// Wipe + reinsert
const { error: delErr } = await sb.from("twitter_weekly").delete().neq("week", "__never__");
if (delErr) { console.error("Delete failed:", delErr.message); process.exit(1); }
console.log("\ntwitter_weekly: cleared");

const { error: insErr } = await sb.from("twitter_weekly").insert(rows);
if (insErr) { console.error("Insert failed:", insErr.message); process.exit(1); }
console.log(`twitter_weekly: ${rows.length} rows inserted`);
