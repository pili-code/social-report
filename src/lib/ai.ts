const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return key;
}

type TextPart = { text: string };
type ImagePart = { inline_data: { mime_type: string; data: string } };
type Part = TextPart | ImagePart;

interface Content {
  role: "user" | "model";
  parts: Part[];
}

async function callGemini(
  systemInstruction: string,
  contents: Content[],
  jsonMode: boolean
): Promise<string> {
  const apiKey = getApiKey();

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
  };
  if (jsonMode) {
    body.generationConfig = { responseMimeType: "application/json", maxOutputTokens: 65536 };
  }

  const bodyStr = JSON.stringify(body);
  let lastErr = "";
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyStr,
    });
    if (res.ok) break;
    lastErr = `${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (res.status !== 429 && res.status !== 500 && res.status !== 502 && res.status !== 503 && res.status !== 504) {
      throw new Error(`Gemini API ${lastErr}`);
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  if (!res || !res.ok) {
    throw new Error(`Gemini API ${lastErr}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts;
  const text = parts?.map((p: { text?: string }) => p.text).filter(Boolean).join("") ?? "";
  return text;
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  return callGemini(
    systemPrompt,
    [{ role: "user", parts: [{ text: userPrompt }] }],
    true
  );
}

export async function generateFromImage(
  systemPrompt: string,
  userPrompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  return callGemini(
    systemPrompt,
    [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Image } },
          { text: userPrompt },
        ],
      },
    ],
    true
  );
}

export async function generateChat(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): Promise<string> {
  const contents: Content[] = [
    ...history.map((h) => ({
      role: (h.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: h.content }],
    })),
    { role: "user" as const, parts: [{ text: userMessage }] },
  ];
  return callGemini(systemPrompt, contents, false);
}
