import { NextResponse } from "next/server";
import { getAllFromTable } from "@/lib/db";

const TABLES = [
  "youtube_weekly",
  "youtube_monthly",
  "youtube_videos",
  "youtube_search_monthly",
  "shorts_weekly",
  "linkedin_dianne_posts",
  "linkedin_dianne_monthly",
  "linkedin_tdp_weekly",
  "cold_email_campaigns",
  "twitter_weekly",
  "workshop_signups",
  "community_funnel_weekly",
  "jobboard_funnel_weekly",
];

export async function GET() {
  const data: Record<string, unknown[]> = {};
  await Promise.all(
    TABLES.map(async (table) => {
      try {
        data[table] = await getAllFromTable(table);
      } catch (err) {
        // Table may not exist yet (e.g. pending schema migration). Don't break the dashboard.
        console.warn(`/api/data: ${table} unavailable —`, err instanceof Error ? err.message : err);
        data[table] = [];
      }
    })
  );
  return NextResponse.json(data);
}
