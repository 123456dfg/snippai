import OpenAIStyleModel from "./openai-style";
import type { AIModelResponse, AIModelTool } from "./types";

const client = new OpenAIStyleModel();

async function gpt4(
  image: string,
  prompt: string,
  apiKey?: string,
  apiUrl?: string,
  model?: string,
  tools?: AIModelTool[]
): Promise<AIModelResponse> {
  return client.chat(image, prompt, apiKey, model, apiUrl ?? "https://api.openai.com/v1", tools);
}

export default gpt4;
