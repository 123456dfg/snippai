import OpenAIStyleModel from "./openai-style";
import type { AIModelResponse, AIModelTool } from "./types";

const client = new OpenAIStyleModel();

async function openaiModel(
  image: string,
  prompt: string,
  apiKey?: string,
  apiUrl?: string,
  model?: string,
  tools?: AIModelTool[]
): Promise<AIModelResponse> {
  return client.chat(image, prompt, apiKey, model, apiUrl, tools);
}

export default openaiModel;
