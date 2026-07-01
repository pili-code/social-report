import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const file = process.argv[2];
const topicTag = process.argv[3] ?? "";
const contentNote = process.argv.slice(4).join(" ");

if (!file) {
  console.error("Usage: node scripts/upload-linkedin-dianne-post.mjs <xlsx-file> [topic_tag] [content_note]");
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDay = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
const startOfWeek = (d) => {
  const o = new Date(d);
  o.setUTCDate(o.getUTCDate() - o.getUTCDay());
  o.setUTCHours(0, 0, 0, 0);
  return o;
};
const weekLabel = (d) => {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setUTCDate(e.getUTCDate() + 6);
  return `${fmtDay(s)}–${fmtDay(e)}, ${s.getUTCFullYear()}`;
};
const toNum = (v) => v == null || v === "" ? 0 : Number(String(v).replace(/,/g, "")) || 0;
const parseDate = (value) => {
  const parts = String(value).split("/").map(Number);
  if (parts.length === 3 && parts.every(Boolean)) {
    return new Date(Date.UTC(parts[2], parts[0] - 1, parts[1]));
  }
  return new Date(value);
};
const inferTopic = (postUrl) => {
  const slug = String(postUrl ?? "").split("/").filter(Boolean).at(-1) ?? "";
  const words = slug
    .replace(/-\d+-[a-z0-9]+$/i, "")
    .replace(/activity-\d+/i, "")
    .split("-")
    .filter((word) => word && !["the", "and", "with", "from", "this", "that"].includes(word.toLowerCase()))
    .slice(0, 5);
  return words.join(" ");
};

const wb = XLSX.read(fs.readFileSync(file));
const sheet = wb.Sheets["Post analytics"];
if (!sheet) throw new Error("Missing sheet: Post analytics");

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });
const kv = new Map();
for (const r of rows) if (r?.[0]) kv.set(String(r[0]).trim(), r[1]);

const d = parseDate(kv.get("Post Date"));
if (isNaN(d.getTime())) throw new Error(`Could not parse Post Date: ${kv.get("Post Date")}`);

const impressions = toNum(kv.get("Impressions"));
const socialEngagements = toNum(kv.get("Social engagements"));
const membersReached = toNum(kv.get("Members reached"));
const followers = toNum(kv.get("Followers gained from this post"));
const comments = toNum(kv.get("Comments"));
const reposts = toNum(kv.get("Reposts"));
const saves = toNum(kv.get("Saves"));
const engagementRate = impressions > 0 ? Math.round((socialEngagements / impressions) * 10000) / 100 : 0;
const postUrl = String(kv.get("Post URL") ?? "").trim();

const row = {
  week: weekLabel(d),
  date: d.toISOString().slice(0, 10),
  post_time: String(kv.get("Post Publish Time") ?? "").trim(),
  post_url: postUrl,
  topic_tag: topicTag || inferTopic(postUrl),
  content_note: contentNote,
  impressions,
  members_reached: membersReached,
  social_engagements: socialEngagements,
  engagement_rate: engagementRate,
  reactions: toNum(kv.get("Reactions")),
  comments,
  reposts,
  saves,
  followers,
  sends: toNum(kv.get("Sends on LinkedIn")),
  link_engagements: toNum(kv.get("Link engagements")),
  premium_button_engagements: toNum(kv.get("Premium custom button engagements")),
  note: `Metrics: ${socialEngagements.toLocaleString()} engagements, ${engagementRate.toFixed(2)}% engagement rate, ${membersReached.toLocaleString()} views/reach, +${followers.toLocaleString()} followers, ${comments.toLocaleString()} comments, ${saves.toLocaleString()} saves, ${reposts.toLocaleString()} reposts.`,
};

console.log(row);
const { error } = await supabase.from("linkedin_dianne_posts").upsert(row, { onConflict: "week,date" });
if (error) throw error;
console.log("linkedin_dianne_posts: 1 row upserted");
