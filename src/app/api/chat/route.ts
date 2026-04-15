import { NextRequest, NextResponse } from "next/server";
import { generateChat } from "@/lib/ai";
import { getAllFromTable } from "@/lib/db";

const TABLES = [
  "youtube_weekly", "youtube_monthly", "youtube_videos", "shorts_weekly",
  "linkedin_dianne_posts", "linkedin_dianne_monthly", "linkedin_tdp_weekly",
  "cold_email_campaigns",
];

const SYSTEM_PROMPT = `You are a GTM (Go-To-Market) performance analyst for The Design Project (TDP), a B2B design team.

You have access to TDP's full channel performance data across YouTube, LinkedIn (Dianne's personal + TDP company page), Shorts, and Cold Email campaigns.

Key context:
- TDP is a B2B design team (not an agency), led by cofounders Alex & Dianne
- Saves are the most important LinkedIn metric, not impressions
- Daily avg views is the honest YouTube metric, not raw weekly totals
- Avg views per clip matters more for Shorts than total batch views
- March 2026 was the best month ever across YouTube and LinkedIn
- The Jan 29 Dianne post is the all-time best (530 saves)
- Feb LinkedIn collapse came from a 5-week posting gap + evening posts
- VC Founders is the best cold email campaign (2.58% reply rate)

When answering:
- Be specific with numbers — cite the data
- Identify trends, patterns, and actionable insights
- Compare periods when relevant (MoM, week-over-week)
- Flag wins and concerns
- Keep responses concise but data-rich
- Use markdown formatting for readability`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    const data: Record<string, unknown[]> = {};
    await Promise.all(
      TABLES.map(async (table) => {
        data[table] = await getAllFromTable(table);
      })
    );

    const dataContext = `Here is the current GTM dashboard data:\n\n${JSON.stringify(data, null, 2)}`;
    const fullMessage = `${dataContext}\n\n---\n\nUser question: ${message}`;

    const response = await generateChat(SYSTEM_PROMPT, history || [], fullMessage);

    return NextResponse.json({ response });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
