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

// Parse the GA4 export directly so country + slug stay in sync
const { parse } = await import("csv-parse/sync");
const fs = await import("node:fs");
const ga4Raw = fs.readFileSync("/Users/pilitdp/Downloads/download (2).csv", "utf8");
const ga4Clean = ga4Raw.split("\n").filter((l) => !l.trim().startsWith("#") && l.trim() !== "").join("\n");
const ga4Rows = parse(ga4Clean, { columns: true, skip_empty_lines: true, relax_column_count: true });

const sources = [];
const countryTotals = new Map();
let launchVisits = 0, backfillVisits = 0, directVisits = 0, referralVisits = 0, otherVisits = 0;
for (const r of ga4Rows) {
  const src = r["Session source / medium"];
  if (!src) continue; // grand total row
  const camp = r["Session manual campaign name"] || "";
  const cont = r["Session manual ad content"] || "";
  const country = r["Country"] || "Unknown";
  const sessions = parseInt(r["Sessions"]) || 0;
  sources.push({ source: src, campaign: camp, content: cont, country, sessions });
  countryTotals.set(country, (countryTotals.get(country) ?? 0) + sessions);
  if (camp === "community_launch") launchVisits += sessions;
  else if (camp === "community_backfill") backfillVisits += sessions;
  else if (src === "(direct) / (none)") directVisits += sessions;
  else if (src.includes("referral") || src.includes("youtube.com")) referralVisits += sessions;
  else otherVisits += sessions;
}
const totalVisits = launchVisits + backfillVisits + directVisits + referralVisits + otherVisits;
const countries = [...countryTotals.entries()].map(([country, sessions]) => ({ country, sessions })).sort((a, b) => b.sessions - a.sessions);
console.log(`Aggregated ${sources.length} source rows → launch=${launchVisits}, backfill=${backfillVisits}, direct=${directVisits}, ref=${referralVisits}, other=${otherVisits}, total=${totalVisits}`);
console.log("Countries:", countries.map((c) => `${c.country}=${c.sessions}`).join(", "));

const row = {
  week: "Apr 8 – May 5, 2026",
  launch_video_title: "I Used Claude Design on a Real Product Feature. My Honest Review",
  launch_video_published: "Apr 30, 2026",
  launch_views: 1623,
  launch_visits: launchVisits,
  backfill_views: 23936,
  backfill_visits: backfillVisits,
  direct_visits: directVisits,
  referral_visits: referralVisits,
  other_visits: otherVisits,
  total_visits: totalVisits,
  clicks: 0,
  conversions: 0,
  revenue_cents: 0,
  source_breakdown_json: JSON.stringify({ sources, countries }),
  note: "First period. Launch video published Apr 30. Backfill descriptions updated retroactively on 3 older videos. Click + conversion tracking pending — no GA4 key event on join CTA, no Stripe/Whop sync.",
};

const { error } = await sb.from("community_funnel_weekly").upsert(row, { onConflict: "week" });
if (error) {
  console.error("Upsert failed:", error.message);
  process.exit(1);
}
console.log("community_funnel_weekly: row upserted for", row.week);
