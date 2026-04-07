import { generateText, generateFromImage } from "./ai";

const SYSTEM_PROMPT = `You are a data extraction and analysis assistant for a GTM (Go-To-Market) performance dashboard used by The Design Project (TDP), a B2B design team.

Your job is to:
1. Analyze uploaded data (raw text from CSV/XLSX, or screenshots)
2. Identify which channel/table it belongs to
3. Extract structured rows
4. Flag missing fields and suggest values where possible
5. Add an "analysis" summary explaining what the data shows

You must return ONLY valid JSON — no markdown, no explanation, no wrapping in code blocks.

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

const USER_PROMPT = "Analyze this data. Extract all GTM data, identify missing fields, suggest completions, and provide analysis. Return ONLY the JSON, no markdown wrapping.";

export async function analyzeImage(
  base64Image: string,
  mediaType: string
): Promise<AnalysisResult> {
  const text = await generateFromImage(SYSTEM_PROMPT, USER_PROMPT, base64Image, mediaType);
  return parseResponse(text);
}

export async function analyzeText(rawText: string, filename: string): Promise<AnalysisResult> {
  const prompt = `${USER_PROMPT}\n\nFile: "${filename}"\n\n---\n${rawText}`;
  const text = await generateText(SYSTEM_PROMPT, prompt);
  return parseResponse(text);
}

function parseResponse(text: string): AnalysisResult {
  let jsonStr = text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(jsonStr);
}
