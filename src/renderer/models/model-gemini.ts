import GeminiStyleModel from "./gemini-style";
import type { AIModelResponse, AIModelTool } from "./types";

const client = new GeminiStyleModel();

async function gemini(
  image: string,
  prompt: string,
  apiKey?: string,
  apiUrl?: string,
  model?: string,
  tools?: AIModelTool[]
): Promise<AIModelResponse> {
  return client.chat(
    image,
    prompt,
    apiKey,
    model ?? "gemini-1.5-pro",
    apiUrl ?? "https://s.global.ssl.fastly.net/v1beta/models/{model}:generateContent",
    tools
  );
}

export default gemini;
