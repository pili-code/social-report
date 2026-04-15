import { NextRequest, NextResponse } from "next/server";
import { parseFileBuffer } from "@/lib/parse-csv";
import { bulkUpsert } from "@/lib/db";

const UNIQUE_KEYS: Record<string, string[]> = {
  youtube_weekly: ["week"],
  youtube_monthly: ["month"],
  youtube_videos: ["title"],
  shorts_weekly: ["week"],
  linkedin_dianne_posts: ["week", "date"],
  linkedin_dianne_monthly: ["month"],
  linkedin_tdp_weekly: ["week"],
  cold_email_campaigns: ["campaign"],
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const action = formData.get("action") as string | null; // "preview" or "save"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = parseFileBuffer(buffer, file.name);

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "Could not detect any GTM data in this file. Check that column headers match expected formats." },
      { status: 422 }
    );
  }

  if (action === "save") {
    const results = [];
    for (const p of parsed) {
      const ukeys = UNIQUE_KEYS[p.table];
      if (!ukeys) continue;
      const res = await bulkUpsert(p.table, p.rows, ukeys);
      results.push({ table: p.table, channel: p.channel, ...res });
    }
    return NextResponse.json({ saved: true, results });
  }

  // Default: preview
  return NextResponse.json({ preview: true, datasets: parsed });
}
