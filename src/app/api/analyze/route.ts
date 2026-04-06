import { NextRequest, NextResponse } from "next/server";
import { analyzeImage, analyzeText } from "@/lib/analyze";
import { bulkUpsert } from "@/lib/db";
import * as XLSX from "xlsx";

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

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const action = formData.get("action") as string | null; // "analyze" or "save"
  const editedData = formData.get("data") as string | null; // JSON string for save action

  if (action === "save" && editedData) {
    try {
      const parsed = JSON.parse(editedData);
      const results = [];
      for (const ds of parsed.datasets) {
        const ukeys = UNIQUE_KEYS[ds.table];
        if (!ukeys) continue;
        const res = bulkUpsert(ds.table, ds.rows, ukeys);
        results.push({ table: ds.table, channel: ds.channel, inserted: res.inserted });
      }
      return NextResponse.json({ saved: true, results });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const isImage = IMAGE_TYPES.includes(file.type);

    if (isImage) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      const result = await analyzeImage(base64, mediaType);
      return NextResponse.json(result);
    }

    // CSV / XLSX — convert to text and send to Claude
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const textParts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      textParts.push(`=== Sheet: ${sheetName} ===\n${csv}`);
    }

    const rawText = textParts.join("\n\n");
    const result = await analyzeText(rawText, file.name);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
