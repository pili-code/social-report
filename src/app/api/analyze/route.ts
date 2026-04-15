import { NextRequest, NextResponse } from "next/server";
import { analyzeImage, analyzeRows, AnalysisResult } from "@/lib/analyze";
import { bulkUpsert, getAllFromTable } from "@/lib/db";
import * as XLSX from "xlsx";

export const maxDuration = 60;

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthSortKey(m: string): number {
  const parts = m.trim().split(/\s+/);
  if (parts.length < 2) return 0;
  const mi = MONTHS.indexOf(parts[0]);
  const yi = parseInt(parts[1], 10);
  if (mi < 0 || !isFinite(yi)) return 0;
  return yi * 12 + mi;
}

async function rebuildYoutubeMonthly(): Promise<number> {
  const weekly = await getAllFromTable("youtube_weekly") as Array<{ month: string; views: number; days: number }>;
  const existing = await getAllFromTable("youtube_monthly") as Array<Record<string, unknown>>;
  const existingByMonth = new Map(existing.map((r) => [String(r.month), r]));

  const buckets = new Map<string, { views: number; days: number }>();
  for (const w of weekly) {
    const m = String(w.month ?? "").trim();
    if (!m) continue;
    const b = buckets.get(m) ?? { views: 0, days: 0 };
    b.views += Number(w.views) || 0;
    b.days += Number(w.days) || 0;
    buckets.set(m, b);
  }

  const sorted = [...buckets.entries()].sort((a, b) => monthSortKey(a[0]) - monthSortKey(b[0]));
  const rows = sorted.map(([month, b], i) => {
    const prev = i > 0 ? sorted[i - 1][1] : null;
    const momPct = prev && prev.views > 0 ? ((b.views - prev.views) / prev.views) * 100 : null;
    const prior = existingByMonth.get(month) ?? {};
    return {
      month,
      views: b.views,
      days: b.days,
      daily_avg: b.days > 0 ? Math.round(b.views / b.days) : 0,
      mom_pct: momPct !== null ? Math.round(momPct * 10) / 10 : null,
      note: (prior.note as string | undefined) ?? "",
      partial: (prior.partial as number | undefined) ?? 0,
      projected: (prior.projected as number | null | undefined) ?? null,
    };
  });

  if (rows.length === 0) return 0;
  const res = await bulkUpsert("youtube_monthly", rows, ["month"]);
  return res.inserted;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const action = formData.get("action") as string | null;
  const editedData = formData.get("data") as string | null;

  if (action === "save" && editedData) {
    try {
      const parsed = JSON.parse(editedData);
      const results = [];
      const savedTables = new Set<string>();
      for (const ds of parsed.datasets) {
        const ukeys = UNIQUE_KEYS[ds.table];
        if (!ukeys) continue;
        const res = await bulkUpsert(ds.table, ds.rows, ukeys);
        results.push({ table: ds.table, channel: ds.channel, inserted: res.inserted });
        savedTables.add(ds.table);
      }
      // Propagate to derived tables
      if (savedTables.has("youtube_weekly")) {
        const n = await rebuildYoutubeMonthly();
        results.push({ table: "youtube_monthly", channel: "YouTube Monthly (auto)", inserted: n });
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

    // CSV / XLSX — parse structurally, then send mapping decision to AI
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });

    const combined: AnalysisResult = { datasets: [], overall_analysis: "" };
    const analyses: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: null,
        raw: false,
        dateNF: "yyyy-mm-dd",
      });
      if (rows.length === 0) continue;

      const label = workbook.SheetNames.length > 1 ? `${file.name} [${sheetName}]` : file.name;
      const res = await analyzeRows(rows, label);
      combined.datasets.push(...res.datasets);
      if (res.overall_analysis) analyses.push(res.overall_analysis);
    }

    combined.overall_analysis = analyses.join(" ");
    return NextResponse.json(combined);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
