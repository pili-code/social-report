import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAllFromTable } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

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
  const { message, history } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  // Load all data
  const ytWeekly = getAllFromTable("youtube_weekly");
  if ((ytWeekly as unknown[]).length === 0) seedDatabase();

  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    data[table] = getAllFromTable(table);
  }

  const dataContext = `Here is the current GTM dashboard data:\n\n${JSON.stringify(data, null, 2)}`;

  try {
    const client = new Anthropic({ apiKey });

    const messages: Anthropic.MessageParam[] = [
      ...(history || []).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      {
        role: "user",
        content: `${dataContext}\n\n---\n\nUser question: ${message}`,
      },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ response: text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
