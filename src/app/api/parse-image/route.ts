import { NextRequest, NextResponse } from "next/server";
import { parseImageWithClaude } from "@/lib/parse-image";
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
  const action = formData.get("action") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const mediaTypes: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };

  const mediaType = mediaTypes[ext || ""] || "image/png";
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  try {
    const datasets = await parseImageWithClaude(base64, mediaType);

    if (action === "save") {
      const results = [];
      for (const ds of datasets) {
        const ukeys = UNIQUE_KEYS[ds.table];
        if (!ukeys) continue;
        const res = bulkUpsert(ds.table, ds.rows, ukeys);
        results.push({ table: ds.table, channel: ds.channel, ...res });
      }
      return NextResponse.json({ saved: true, results });
    }

    return NextResponse.json({ preview: true, datasets });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to parse image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
