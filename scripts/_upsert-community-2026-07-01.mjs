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
// Refreshed Jul 1, 2026. Stripe customers through Jun 29; GA4 + YouTube
// traffic May 8-Jul 1. Keep this as an aggregate dashboard row matching
// the earlier gist-based community_funnel_weekly rows.
const sources = [
  { source: "youtube / mixed", campaign: "community_youtube", content: "all_community_drivers", sessions: 1236 },
  { source: "google organic + jobs / mixed", campaign: "organic_jobs", content: "", sessions: 94 },
  { source: "chatgpt + ai assistants / referral", campaign: "ai_referral", content: "", sessions: 107 },
  { source: "(direct) / (none)", campaign: "(direct)", content: "", sessions: 71 },
  { source: "jobboard / mixed", campaign: "jobboard", content: "", sessions: 25 },
  { source: "email + newsletter / mixed", campaign: "email_newsletter", content: "", sessions: 49 },
  { source: "workshop + luma / mixed", campaign: "workshop_luma", content: "", sessions: 52 },
  { source: "stripe-return + tag assistant + other / referral", campaign: "other_referral", content: "", sessions: 47 },
];

const perVideo = [
  { video: "Design Systems for Beginners", utm_family: "agentic_design_systems", views: 17468, visits: 689, visit_ctr: 3.94, purchases: 6, visit_to_purchase: 0.87, view_to_purchase: 0.034 },
  { video: "Don't Build a Design System", utm_family: "dont_build_a_design_system_from_scratch", views: 6291, visits: 131, visit_ctr: 2.08, purchases: 2, visit_to_purchase: 1.53, view_to_purchase: 0.032 },
  { video: "AI-managed Design System With Skills", utm_family: "design_system_skills", views: 8252, visits: 120, visit_ctr: 1.45, purchases: 1, visit_to_purchase: 0.83, view_to_purchase: 0.012 },
  { video: "Toolkit / repo CTA", utm_family: "toolkit_repo", views: 1277, visits: 11, visit_ctr: 0.86, purchases: 1, visit_to_purchase: 9.09, view_to_purchase: 0.078 },
  { video: "Design.md", utm_family: "design_md", views: 6997, visits: 96, visit_ctr: 1.37, purchases: 0, visit_to_purchase: 0, view_to_purchase: 0 },
  { video: "Mobbin MCP", utm_family: "mobbin_mcp", views: 5697, visits: 26, visit_ctr: 0.46, purchases: 0, visit_to_purchase: 0, view_to_purchase: 0 },
  { video: "Claude vs Codex", utm_family: "claude_vs_codex", views: 2319, visits: 25, visit_ctr: 1.08, purchases: 0, visit_to_purchase: 0, view_to_purchase: 0 },
  { video: "Fable 5", utm_family: "fable_5", views: 1866, visits: 13, visit_ctr: 0.70, purchases: 0, visit_to_purchase: 0, view_to_purchase: 0 },
  { video: "I Built My Design System in 4 Hours", utm_family: "design_system_4_hours", views: 16490, visits: 25, visit_ctr: 0.15, purchases: 0, visit_to_purchase: 0, view_to_purchase: 0 },
];

const weeklyTrend = [
  { week: "Pre W1 May 8-11", total_visits: 173, youtube_visits: 162, net_active_adds: 1, visit_to_active_buyer: 0.58, ga_purchase_events: 0 },
  { week: "W1 May 12-18", total_visits: 360, youtube_visits: 230, net_active_adds: 5, visit_to_active_buyer: 1.39, ga_purchase_events: 0 },
  { week: "W2 May 19-25", total_visits: 272, youtube_visits: 153, net_active_adds: 1, visit_to_active_buyer: 0.37, ga_purchase_events: 2 },
  { week: "W3 May 26-Jun 1", total_visits: 170, youtube_visits: 100, net_active_adds: 3, visit_to_active_buyer: 1.76, ga_purchase_events: 3 },
  { week: "W4 Jun 2-8", total_visits: 193, youtube_visits: 146, net_active_adds: 2, visit_to_active_buyer: 1.04, ga_purchase_events: 2 },
  { week: "W5 Jun 9-15", total_visits: 218, youtube_visits: 184, net_active_adds: 2, visit_to_active_buyer: 0.92, ga_purchase_events: 0 },
  { week: "W6 Jun 16-22", total_visits: 142, youtube_visits: 130, net_active_adds: 1, visit_to_active_buyer: 0.70, ga_purchase_events: 1 },
  { week: "W7 Jun 23-29", total_visits: 125, youtube_visits: 105, net_active_adds: 3, visit_to_active_buyer: 2.40, ga_purchase_events: 3 },
  { week: "W8 Jun 30-Jul 1 partial", total_visits: 28, youtube_visits: 26, net_active_adds: 0, visit_to_active_buyer: 0, ga_purchase_events: 0 },
];

const memberSourceMix = [
  { source: "YouTube", active_members: 10, share: 56 },
  { source: "Job board", active_members: 1, share: 6 },
  { source: "Workshop", active_members: 1, share: 6 },
  { source: "Masked by Stripe referral", active_members: 1, share: 6 },
  { source: "Untracked", active_members: 5, share: 28 },
];

const launchViews = perVideo.reduce((sum, row) => sum + row.views, 0);
const launchVisits = 1236;
const directVisits = 71;
const referralVisits = 107 + 47;
const otherVisits = 94 + 25 + 49 + 52;
const totalVisits = launchVisits + directVisits + referralVisits + otherVisits;
const countries = [];

const row = {
  week: "May 8 – Jul 1, 2026",
  launch_video_title: "9 community-promoting YouTube videos",
  launch_video_published: "Traffic window May 8-Jul 1, 2026",
  launch_views: launchViews,
  launch_visits: launchVisits,
  backfill_views: 0,
  backfill_visits: 0,
  direct_visits: directVisits,
  referral_visits: referralVisits,
  other_visits: otherVisits,
  total_visits: totalVisits,
  clicks: 0,
  conversions: 18,
  revenue_cents: 304200,
  source_breakdown_json: JSON.stringify({ sources, countries, perVideo, weeklyTrend, memberSourceMix }),
  note:
    "Source: community funnel gist refreshed Jul 1. Stripe through Jun 29; GA4 + YouTube traffic May 8-Jul 1. 22 gross paid purchases, 4 refunded/churned, 18 active members, $3,042 collected. YouTube drove 1,236 of 1,681 /community/ visits (74%) and 10 active members. GA4 purchase tracking improved to 11 events but still undercounts 22 gross purchases; keep treating active buyers as business truth. Biggest CTA leak remains I Built My Design System in 4 Hours: 16,490 May 8+ views, 25 community visits, 0 purchases.",
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
