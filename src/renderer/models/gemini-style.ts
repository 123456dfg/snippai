import type { AIModelResponse, AIModelTool } from "./types";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

function replaceTemplateValues(template: string, model: string, apiKey: string | undefined): string {
  return template
    .replaceAll("{model}", encodeURIComponent(model))
    .replaceAll("{api_key}", encodeURIComponent(apiKey ?? ""));
}

function buildGeminiUrl(apiUrl: string, model: string, apiKey: string | undefined): string {
  const trimmed = apiUrl.trim();
  if (!trimmed) {
    throw new Error("Gemini 风格模型缺少 API URL。");
  }

  let url = replaceTemplateValues(trimmed, model, apiKey);
  if (!url.includes(":generateContent")) {
    const normalized = url.replace(/\/+$/, "");
    url = `${normalized}/models/${encodeURIComponent(model)}:generateContent`;
  }

  if (
    apiKey &&
    !url.includes("api_key=") &&
    !url.includes("key=") &&
    url.includes("generativelanguage.googleapis.com")
  ) {
    url += `${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`;
  }

  return url;
}

export default class GeminiStyleModel {
  async chat(
    image: string,
    prompt: string,
    apiKey: string | undefined,
    model: string | undefined,
    apiUrl: string | undefined,
    tools?: AIModelTool[]
  ): Promise<AIModelResponse> {
    if (!apiUrl) {
      throw new Error("Gemini 风格模型缺少 API URL。");
    }

    const endpoint = buildGeminiUrl(apiUrl, model ?? "gemini-1.5-pro", apiKey);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey && !endpoint.includes("key=") && !endpoint.includes("api_key=")) {
      headers["x-goog-api-key"] = apiKey;
    }

    if (tools && tools.length > 0) {
      // Gemini implementation currently does not consume tool schema in this project.
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
          stopSequences: [],
        },
      }),
      redirect: "follow",
    });

    const result = (await response.json()) as GeminiResponse;
    if (!response.ok) {
      throw new Error(result.error?.message ?? "Gemini 风格模型请求失败。");
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("模型返回内容为空。");
    }

    return {
      content: text,
      toolCalls: [],
    };
  }
}
