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
// Refreshed Jul 1, 2026. The gist provides job-board attribution outcomes
// inside the community funnel, but not the /jobs/* page-view denominator or
// event split used by earlier dedicated job-board GA4 exports.
const row = {
  week: "May 8 – Jul 1, 2026",
  banner_launched_at: "May 8, 2026",
  jobs_page_views: 0,
  jobs_landing_views: 0,
  banner_clicks: 0,
  other_clicks: 25,
  total_community_clicks: 25,
  community_landings: 25,
  community_success_views: 1,
  community_total_views: 1681,
  community_total_users: 1681,
  newsletter_clicks: 0,
  youtube_clicks: 0,
  conversions: 1,
  revenue_cents: 16900,
  note:
    "Source: Jul 1 community funnel gist. Job board contributed 25 /community/ visits (1% of 1,681) and 1 active member, Martina. The gist does not include /jobs/* page views, banner-page views, or the banner vs other CTA event split, so jobs_page_views/jobs_landing_views/banner_clicks are left at 0 and total_community_clicks carries the attributed job-board community visits.",
};

const { error } = await sb.from("jobboard_funnel_weekly").upsert(row, { onConflict: "week" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}

console.log("jobboard_funnel_weekly: row upserted for", row.week);
console.log({
  total_community_clicks: row.total_community_clicks,
  community_landings: row.community_landings,
  conversions: row.conversions,
  revenue_cents: row.revenue_cents,
});
