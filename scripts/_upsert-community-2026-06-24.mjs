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

// Source: https://gist.github.com/pili-code/1a03931568c90792ccd359efb3601b06
// Refreshed Jun 24. Stripe customers through Jun 23; GA4 / YouTube traffic
// May 27-Jun 24. Keep this as an aggregate dashboard row, matching the
// previous May 12-Jun 10 row shape.
const sources = [
  { source: "youtube / video+description+pinned+referral", campaign: "community_youtube", content: "all_tagged_and_referral", sessions: 467 },
  { source: "google / organic+jobs", campaign: "(organic)", content: "", sessions: 39 },
  { source: "chatgpt.com / referral", campaign: "(referral)", content: "", sessions: 33 },
  { source: "(direct) / (none)", campaign: "(not set)", content: "", sessions: 31 },
  { source: "jobboard / popup+banner", campaign: "jobboard", content: "", sessions: 17 },
  { source: "email+newsletter / mixed", campaign: "email_newsletter", content: "", sessions: 8 },
  { source: "luma+github+stripe-return+other / referral", campaign: "(referral)", content: "", sessions: 17 },
];

const perVideo = [
  { video: "Design Systems for Beginners", views: 6429, visits: 172, ctr: 2.68 },
  { video: "Don't Build a Design System", views: 1822, visits: 41, ctr: 2.25 },
  { video: "AI-managed Design System / Skills", views: 7094, visits: 99, ctr: 1.4 },
  { video: "Design.md", views: 6096, visits: 73, ctr: 1.2 },
  { video: "Fable 5", views: 1778, visits: 12, ctr: 0.67 },
  { video: "Mobbin MCP", views: 5175, visits: 23, ctr: 0.44 },
  { video: "Claude vs Codex", views: 565, visits: 2, ctr: 0.35 },
  { video: "I Built My Design System in 4 Hours", views: 8170, visits: 10, ctr: 0.12 },
  { video: "Stop Wasting Dev Time", views: 2704, visits: 1, ctr: 0.04 },
];

const weeklyTrend = [
  { week: "W3 May26-Jun1", total_visits: 117, youtube_visits: 65, youtube_share: 56, community_video_views_top5: 5652, view_to_click_ctr: 1.15 },
  { week: "W4 Jun2-8", total_visits: 160, youtube_visits: 121, youtube_share: 76, community_video_views_top5: 8345, view_to_click_ctr: 1.45 },
  { week: "W5 Jun9-15", total_visits: 193, youtube_visits: 161, youtube_share: 83, community_video_views_top5: 10856, view_to_click_ctr: 1.48 },
  { week: "W6 Jun16-22", total_visits: 140, youtube_visits: 118, youtube_share: 84, community_video_views_top5: 7007, view_to_click_ctr: 1.68 },
  { week: "W7 Jun23-29 partial", total_visits: 27, youtube_visits: 18, youtube_share: 67, community_video_views_top5: 1104, view_to_click_ctr: 1.63 },
];

const countries = [];

const row = {
  week: "May 12 – Jun 24, 2026",
  launch_video_title: "9 community-promoting YouTube videos",
  launch_video_published: "Traffic window May 27-Jun 24, 2026",
  launch_views: 39833,
  launch_visits: 467,
  backfill_views: 0,
  backfill_visits: 0,
  direct_visits: 31,
  referral_visits: 50,
  other_visits: 64,
  total_visits: 612,
  clicks: 0,
  conversions: 20,
  revenue_cents: 287300,
  source_breakdown_json: JSON.stringify({ sources, countries, perVideo, weeklyTrend }),
  note:
    "Source: community funnel gist refreshed Jun 24. Stripe customers through Jun 23; GA4 + YouTube traffic May 27-Jun 24. Launch-to-date: 20 gross purchases, 17 active, 3 refunded, $2,873 collected. YouTube drove 467 of 612 /community/ visits (about 76%) and 6 of 7 traced in-window buys. Active-member attribution: YouTube 8, job board 1, workshop 1, Stripe-masked 1, no signal 6. click stage remains 0 because community_join_click / purchase event tracking is incomplete; use visits -> members from gist until tracking is fixed. Biggest leak: 4 Hours video has 8,170 views and 0.12% CTR.",
};

if (row.launch_visits + row.direct_visits + row.referral_visits + row.other_visits !== row.total_visits) {
  throw new Error("Community funnel buckets do not sum to total_visits");
}

const { error } = await sb.from("community_funnel_weekly").upsert(row, { onConflict: "week" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}

console.log("community_funnel_weekly: row upserted for", row.week);
console.log({
  launch_views: row.launch_views,
  launch_visits: row.launch_visits,
  total_visits: row.total_visits,
  conversions: row.conversions,
  revenue_cents: row.revenue_cents,
});
