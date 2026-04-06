import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a data extraction and analysis assistant for a GTM (Go-To-Market) performance dashboard used by The Design Project (TDP), a B2B design team.

Your job is to:
1. Analyze uploaded data (raw text from CSV/XLSX, or screenshots)
2. Identify which channel/table it belongs to
3. Extract structured rows
4. Flag missing fields and suggest values where possible
5. Add an "analysis" summary explaining what the data shows

You must return ONLY valid JSON — no markdown, no explanation, no wrapping.

The JSON must have this structure:
{
  "datasets": [
    {
      "table": "<table_name>",
      "channel": "<human label>",
      "columns": ["col1", "col2", ...],
      "rows": [ { "col1": val, "col2": val, ... }, ... ],
      "missing_fields": [
        { "row_index": 0, "field": "month", "suggestion": "Apr 2026", "reason": "Inferred from date range" }
      ],
      "analysis": "Brief 1-2 sentence summary of what this data shows and any notable patterns."
    }
  ],
  "overall_analysis": "Brief summary across all datasets — what's notable, any red flags, any wins."
}

Available tables and their columns:
- "youtube_weekly": week, month, views, days
- "youtube_monthly": month, views, days, daily_avg, mom_pct, note
- "youtube_videos": published, title, views, impressions, ctr, subs, note
- "shorts_weekly": week, clips, total_views, avg_per_clip, impressions, note
- "linkedin_dianne_posts": week, date, post_time, impressions, reactions, comments, reposts, saves, followers, note
- "linkedin_dianne_monthly": month, impressions, saves, posts, mom_imp, mom_saves, note
- "linkedin_tdp_weekly": week, impressions, clicks, ctr, reactions, note
- "cold_email_campaigns": campaign, status, window, sent, contacted, replies, reply_rate, interested, note

Rules:
- Extract ALL visible data rows
- Use exact column names listed above
- For "week" fields, use format like "Mar 29–Apr 4"
- For "month" fields, use format like "Mar 2026"
- Numbers should be integers (no commas), except ctr/reply_rate/mom_pct which are floats
- If you can't determine a value, set it to null AND add it to missing_fields with a suggestion if possible
- If data doesn't match any table, try your best to map it to the closest one
- Calculate derived fields when possible (e.g. avg_per_clip = total_views / clips, daily_avg = views / days, reply_rate = replies / contacted * 100)
- If the input is empty or unrecognizable, return {"datasets": [], "overall_analysis": "Could not identify any GTM data in this input."}`;

export interface AnalysisResult {
  datasets: Array<{
    table: string;
    channel: string;
    columns: string[];
    rows: Record<string, unknown>[];
    missing_fields: Array<{
      row_index: number;
      field: string;
      suggestion: unknown;
      reason: string;
    }>;
    analysis: string;
  }>;
  overall_analysis: string;
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    throw new Error("ANTHROPIC_API_KEY not configured. Add your key to .env.local");
  }
  return new Anthropic({ apiKey });
}

export async function analyzeImage(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<AnalysisResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: "Analyze this screenshot. Extract all GTM data, identify missing fields, suggest completions, and provide analysis. Return ONLY the JSON.",
          },
        ],
      },
    ],
  });

  return parseResponse(response);
}

export async function analyzeText(rawText: string, filename: string): Promise<AnalysisResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyze this data from file "${filename}". Extract all GTM data, identify missing fields, suggest completions, and provide analysis. Return ONLY the JSON.\n\n---\n${rawText}`,
      },
    ],
  });

  return parseResponse(response);
}

function parseResponse(response: Anthropic.Message): AnalysisResult {
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(jsonStr);
}
