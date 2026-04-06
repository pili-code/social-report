import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a data extraction assistant for a GTM (Go-To-Market) performance dashboard.
Your job is to extract structured data from screenshots of analytics dashboards (YouTube Studio, LinkedIn Analytics, cold email tools, spreadsheets, etc).

You must return ONLY valid JSON — no markdown, no explanation, no wrapping.

The JSON must be an array of objects, where each object has:
- "table": one of these exact values:
  - "youtube_weekly" (columns: week, month, views, days)
  - "youtube_monthly" (columns: month, views, days, daily_avg, mom_pct, note)
  - "youtube_videos" (columns: published, title, views, impressions, ctr, subs, note)
  - "shorts_weekly" (columns: week, clips, total_views, avg_per_clip, impressions, note)
  - "linkedin_dianne_posts" (columns: week, date, post_time, impressions, reactions, comments, reposts, saves, followers, note)
  - "linkedin_dianne_monthly" (columns: month, impressions, saves, posts, mom_imp, mom_saves, note)
  - "linkedin_tdp_weekly" (columns: week, impressions, clicks, ctr, reactions, note)
  - "cold_email_campaigns" (columns: campaign, status, window, sent, contacted, replies, reply_rate, interested, note)
- "channel": a human-readable label for the channel
- "rows": an array of row objects with the appropriate columns
- "columns": an array of column names present in the rows

Rules:
- Extract ALL visible data rows from the screenshot
- Use the exact column names listed above
- For "week" fields, use format like "Mar 29–Apr 4"
- For "month" fields, use format like "Mar 2026"
- Numbers should be integers (no commas), except ctr/reply_rate/mom_pct which are floats
- If you can't determine a value, use null
- If the screenshot doesn't contain recognizable GTM data, return an empty array []`;

export async function parseImageWithClaude(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<{ table: string; channel: string; rows: Record<string, unknown>[]; columns: string[] }[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    throw new Error("ANTHROPIC_API_KEY not configured. Add it to .env.local");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
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
            text: "Extract all GTM performance data from this screenshot. Return ONLY the JSON array, nothing else.",
          },
        ],
      },
    ],
    system: SYSTEM_PROMPT,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Try to parse JSON, handling potential markdown wrapping
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr);
}
