import type { AIModelResponse, AIModelTool } from "./types";

interface AnthropicContentBlock {
  type?: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  error?: {
    message?: string;
  };
}

export default class AnthropicStyleModel {
  async testConnection(apiKey: string, model: string | undefined, apiUrl: string): Promise<void> {
    if (!apiUrl) {
      throw new Error("Missing API URL.");
    }
    if (!apiKey) {
      throw new Error("Missing API key.");
    }

    const baseUrl = apiUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model ?? "claude-sonnet-4-20250514",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
      redirect: "follow",
    });

    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as AnthropicResponse;
      throw new Error(result.error?.message ?? `Request failed (${response.status}).`);
    }
  }

  async chat(
    image: string,
    prompt: string,
    apiKey: string | undefined,
    model: string | undefined,
    apiUrl: string | undefined,
    tools?: AIModelTool[]
  ): Promise<AIModelResponse> {
    if (!apiUrl) {
      throw new Error("The Anthropic model is missing an API URL.");
    }
    if (!apiKey) {
      throw new Error("This model requires an API key.");
    }

    if (tools && tools.length > 0) {
      // Anthropic implementation currently does not consume tool schema in this project.
    }

    const baseUrl = apiUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: model ?? "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
      redirect: "follow",
    });

    const result = (await response.json()) as AnthropicResponse;
    if (!response.ok) {
      throw new Error(result.error?.message ?? "The Anthropic model request failed.");
    }

    const textParts = (result.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string" && block.text.length > 0)
      .map((block) => block.text as string);

    const content = textParts.join("\n");
    if (!content) {
      throw new Error("The model returned empty content.");
    }

    return {
      content,
      toolCalls: [],
    };
  }
}

const defaultClient = new AnthropicStyleModel();

export function anthropicRunner(
  image: string,
  prompt: string,
  apiKey?: string,
  apiUrl?: string,
  model?: string,
  tools?: AIModelTool[]
): Promise<AIModelResponse> {
  return defaultClient.chat(
    image,
    prompt,
    apiKey,
    model ?? "claude-sonnet-4-20250514",
    apiUrl ?? "https://api.anthropic.com/v1",
    tools
  );
}
