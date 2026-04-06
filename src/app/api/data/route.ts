import { NextResponse } from "next/server";
import { getAllFromTable } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

const TABLES = [
  "youtube_weekly",
  "youtube_monthly",
  "youtube_videos",
  "shorts_weekly",
  "linkedin_dianne_posts",
  "linkedin_dianne_monthly",
  "linkedin_tdp_weekly",
  "cold_email_campaigns",
];

export async function GET() {
  // Seed if empty
  const ytWeekly = getAllFromTable("youtube_weekly");
  if (ytWeekly.length === 0) {
    seedDatabase();
  }

  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    data[table] = getAllFromTable(table);
  }

  return NextResponse.json(data);
}
