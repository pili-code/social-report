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

// Source breakdown reconstructed from the May 12-19 GA4 analysis gist:
// https://gist.github.com/pili-code/1a03931568c90792ccd359efb3601b06
// Each row is a (source/medium, campaign, content) cell with sessions to /community/.
const sources = [
  // YouTube — community_launch (agentic_design_systems = "Design Systems for Beginners (Claude...)")
  { source: "youtube / description", campaign: "community_launch", content: "agentic_design_systems", sessions: 123 },
  { source: "youtube / pinned_comment", campaign: "community_launch", content: "agentic_design_systems", sessions: 13 },
  { source: "youtube / card", campaign: "community_launch", content: "agentic_design_systems", sessions: 1 },
  // YouTube — community_launch (launch_video = "I Used Claude Design on a Real Product Feature")
  { source: "youtube / description", campaign: "community_launch", content: "launch_video", sessions: 3 },
  { source: "youtube / pinned_comment", campaign: "community_launch", content: "launch_video", sessions: 3 },
  // YouTube — community_yt_evergreen (don't_build_a_design_system_from_scratch)
  { source: "youtube / description", campaign: "community_yt_evergreen", content: "dont_build_a_design_system_from_scratch", sessions: 40 },
  { source: "youtube / card", campaign: "community_yt_evergreen", content: "dont_build_a_design_system_from_scratch", sessions: 4 },
  // YouTube — older UTM convention (kebab-case campaign, "pinned-comment" as content)
  { source: "youtube / video", campaign: "design-system-scratch", content: "pinned-comment", sessions: 6 },
  // YouTube — community_backfill (slug truncated by GA4 at 40 chars)
  { source: "youtube / description", campaign: "community_backfill", content: "i_built_my_entire_design_system_in_4_hou", sessions: 5 },
  // YouTube — workshop recording (no utm_content set)
  { source: "youtube / description", campaign: "design_systems_workshop_recording", content: "", sessions: 3 },
  // YouTube — untagged referral
  { source: "youtube.com / referral", campaign: "", content: "", sessions: 7 },
  // Workshop — live chat link
  { source: "workshop / live_chat", campaign: "", content: "", sessions: 16 },
  // Job board popup (UTMs preserved because popup opens new tab)
  { source: "jobboard / popup", campaign: "", content: "", sessions: 9 },
  // Direct + organic + everything else
  { source: "(direct) / (none)", campaign: "", content: "", sessions: 23 },
  { source: "google / organic", campaign: "", content: "", sessions: 28 },
  { source: "luma / referral", campaign: "", content: "", sessions: 7 },
  { source: "newsletter / email", campaign: "", content: "", sessions: 2 },
  { source: "other / referral", campaign: "", content: "", sessions: 42 },
  // Unattributable gap: gist reports 374 /community/ viewers top-of-funnel, but the
  // per-source/medium/campaign breakdown sums to 335. The 39-session gap reflects
  // edge-case attribution (sessions GA4 couldn't bucket cleanly). Carry it as "other"
  // so total_visits matches the gist's top-of-funnel claim.
  { source: "(unattributed) / (other)", campaign: "", content: "", sessions: 39 },
];

// Aggregate into funnel buckets the way the dashboard expects.
let launchVisits = 0, backfillVisits = 0, directVisits = 0, referralVisits = 0, otherVisits = 0;
for (const r of sources) {
  if (r.campaign === "community_launch") launchVisits += r.sessions;
  else if (r.campaign === "community_backfill") backfillVisits += r.sessions;
  else if (r.source === "(direct) / (none)") directVisits += r.sessions;
  else if (r.source.includes("referral") || r.source.includes("youtube.com")) referralVisits += r.sessions;
  else otherVisits += r.sessions;
}
const totalVisits = launchVisits + backfillVisits + directVisits + referralVisits + otherVisits;
console.log({ launchVisits, backfillVisits, directVisits, referralVisits, otherVisits, totalVisits });

// Country breakdown — gist gives customer countries (n=9), not all-session country split.
// Leaving empty; the dashboard tolerates this.
const countries = [];

const row = {
  week: "May 12 – May 19, 2026",
  launch_video_title: "Design Systems for Beginners + Claude Design Review (2 videos)",
  launch_video_published: "Apr 30, 2026",
  // launch_views = combined lifetime views of the two community_launch videos.
  // YT data in DB is current through May 12; refresh upstream for a precise May 19 number.
  launch_views: 2025 + 5533, // 7558
  launch_visits: launchVisits,
  backfill_views: 23936, // unchanged from prior row; YT data stale through May 12
  backfill_visits: backfillVisits,
  direct_visits: directVisits,
  referral_visits: referralVisits,
  other_visits: otherVisits,
  total_visits: totalVisits,
  clicks: 51, // community_join_click events in window
  conversions: 9, // Stripe real customers (excludes Alex/Paco test accounts + Tag Assistant)
  revenue_cents: 9 * 169 * 100, // $169 founding-member price × 9
  source_breakdown_json: JSON.stringify({ sources, countries }),
  note: "9 real Stripe purchases, $1,521 revenue. YouTube delivered 4 confirmed conversions (Gabriel, Holger, Paul, David); workshop sent 1-2 (Shuchen/Natalia); jobboard popup sent 1 (Martina). 3 conversions unresolved due to community_purchase tag misfire (only 1 of 9 fired). Best converter: dont_build_a_design_system_from_scratch description link (5.0% view→success). Best volume: agentic_design_systems but 0.7% conversion. Tag fix + UTM-naming hygiene in gist.",
};

const { error } = await sb.from("community_funnel_weekly").upsert(row, { onConflict: "week" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}
console.log("community_funnel_weekly: row upserted for", row.week);
