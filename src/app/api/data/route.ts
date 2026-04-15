import { NextResponse } from "next/server";
import { getAllFromTable } from "@/lib/db";

const TABLES = [
  "youtube_weekly",
  "youtube_monthly",
  "youtube_videos",
  "shorts_weekly",
  "linkedin_dianne_posts",
  "linkedin_dianne_monthly",
  "linkedin_tdp_weekly",
  "cold_email_campaigns",
  "twitter_weekly",
];

export async function GET() {
  const data: Record<string, unknown[]> = {};
  await Promise.all(
    TABLES.map(async (table) => {
      data[table] = await getAllFromTable(table);
    })
  );
  return NextResponse.json(data);
}
