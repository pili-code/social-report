const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key === "your-key-here") {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  return key;
}

const MODEL = "google/gemma-3-27b-it:free";

interface Message {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

async function callOpenRouter(messages: Message[]): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "HTTP-Referer": "https://gtm-app-lovat.vercel.app",
      "X-Title": "TDP GTM Dashboard",
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
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
