const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key === "your-key-here") {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  return key;
}

// Fallback chain — if one model is rate-limited, try the next
const MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "minimax/minimax-m2.5:free",
  "google/gemma-3-27b-it:free",
];

interface Message {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

async function callOpenRouter(messages: Message[]): Promise<string> {
  const apiKey = getApiKey();
  let lastError = "";

  for (const model of MODELS) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://gtm-app-lovat.vercel.app",
          "X-Title": "TDP GTM Dashboard",
        },
        body: JSON.stringify({ model, messages }),
      });

      const data = await res.json();

      if (data.error) {
        lastError = `${model}: ${data.error.message || JSON.stringify(data.error)}`;
        continue; // try next model
      }

      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      lastError = `${model}: ${err instanceof Error ? err.message : "unknown error"}`;
      continue;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  return callOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

export async function generateFromImage(
  systemPrompt: string,
  userPrompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  return callOpenRouter([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
      ],
    },
  ]);
}

export async function generateChat(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): Promise<string> {
  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({
      role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: userMessage },
  ];
  return callOpenRouter(messages);
}
