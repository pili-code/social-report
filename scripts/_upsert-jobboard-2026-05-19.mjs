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

// GA4 May 12-19 numbers pulled via `gog analytics report 374848424 --from=2026-05-12 --to=2026-05-19`.
// Cross-referenced against the May 12-19 gist: 1 confirmed Stripe purchase (Martina, jobboard/popup).
const row = {
  week: "May 12 – May 19, 2026",
  banner_launched_at: "May 12, 2026", // popup tagged events first fired this day
  jobs_page_views: 65332, // any /jobs/* pagePath (GA4 dedup)
  jobs_landing_views: 839, // /jobs/ landing alone (GA4 dedup; /jobs/ + /jobs)
  banner_clicks: 46, // GA4 jobboard_banner_to_community
  other_clicks: 41, // GA4 jobboard_to_community
  total_community_clicks: 87, // 46 + 41
  // Closed-funnel community landings: gist says only 9 sessions had jobboard as session source
  // because most banner clicks are internal navs (don't flip session attribution). Using the
  // GA4-attributed session count rather than total clicks to stay consistent with the prior row.
  community_landings: 9,
  community_success_views: 1, // Martina, May 12, jobboard/popup
  community_total_views: 425, // /community/ pagePath PV
  community_total_users: 300, // /community/ pagePath unique users
  newsletter_clicks: 21,
  youtube_clicks: 10,
  conversions: 1, // Martina (Australia), $169
  revenue_cents: 16900,
  note: "Popup launched May 12. Banner CTR on /jobs/ landing: 46/839 = 5.5%. 87 jobboard→community clicks total but only 9 sessions kept jobboard as source (internal-nav attribution loss — see gist 'job-board paradox'). 1 confirmed Stripe purchase (Martina, popup). Fix: add UTMs to /jobs/* community CTAs so click forces new session attribution.",
};

const { error } = await sb.from("jobboard_funnel_weekly").upsert(row, { onConflict: "week" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}
console.log("jobboard_funnel_weekly: row upserted for", row.week);
