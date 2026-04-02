import type { AIModelResponse, AIModelTool, AIModelToolCall } from "./types";

interface OpenAIMessageContentPart {
  type?: string;
  text?: string;
}

interface OpenAIChatChoice {
  message?: {
    content?: string | OpenAIMessageContentPart[];
    tool_calls?: OpenAIToolCall[];
  };
}

interface OpenAIToolCall {
      id?: string;
      function?: {
        name?: string;
        arguments?: string;
      };
}

interface OpenAIChatResponse {
  choices?: OpenAIChatChoice[];
  error?: {
    message?: string;
  };
}

function normalizeOpenAIBaseUrl(apiUrl: string): string {
  return apiUrl.replace(/\/+$/, "");
}

function extractMessageContent(content: string | OpenAIMessageContentPart[] | undefined): string {
  if (!content) {
    return "";
  }
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((part) => typeof part.text === "string" && part.text.length > 0)
    .map((part) => part.text)
    .join("\n");
}

function extractToolCalls(toolCalls: OpenAIToolCall[] | undefined): AIModelToolCall[] {
  if (!toolCalls || !Array.isArray(toolCalls)) {
    return [];
  }
  return toolCalls
    .map((item, index) => ({
      id: item.id ?? `tool-${index + 1}`,
      name: item.function?.name ?? "",
      arguments: item.function?.arguments ?? "{}",
    }))
    .filter((item) => item.name.length > 0);
}

export default class OpenAIStyleModel {
  async chat(
    image: string,
    prompt: string,
    apiKey: string | undefined,
    model: string | undefined,
    apiUrl: string | undefined,
    tools?: AIModelTool[]
  ): Promise<AIModelResponse> {
    if (!apiUrl) {
      throw new Error("OpenAI 风格模型缺少 API URL。");
    }
    if (!apiKey) {
      throw new Error("当前模型需要 API Key。");
    }

    const baseUrl = normalizeOpenAIBaseUrl(apiUrl);
    const requestBody: Record<string, unknown> = {
      model: model ?? "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
              },
            },
          ],
        },
      ],
    };
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = "auto";
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
      redirect: "follow",
    });

    const result = (await response.json()) as OpenAIChatResponse;
    if (!response.ok) {
      throw new Error(result.error?.message ?? "OpenAI 风格模型请求失败。");
    }

    const message = result.choices?.[0]?.message;
    const content = extractMessageContent(message?.content);
    const toolCalls = extractToolCalls(message?.tool_calls);
    if (!content && toolCalls.length === 0) {
      throw new Error("模型返回内容为空。");
    }
    return {
      content,
      toolCalls,
    };
  }
}
