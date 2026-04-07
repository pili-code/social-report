import { GoogleGenerativeAI } from "@google/generative-ai";

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    throw new Error("GEMINI_API_KEY not configured. Get a free key at https://aistudio.google.com/apikey and add it to .env.local");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

export async function generateFromImage(
  systemPrompt: string,
  userPrompt: string,
  base64Image: string,
  mimeType: string
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent([
    userPrompt,
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  return result.response.text();
}

export async function generateChat(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  userMessage: string
): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    history: history.map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}
