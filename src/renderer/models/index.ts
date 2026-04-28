import { findModelByValue } from "../lib/models";
import { geminiRunner } from "./gemini-style";
import { openaiRunner } from "./openai-style";
import { anthropicRunner } from "./anthropic-style";
import type { AIModelResponse, AIModelTool } from "./types";

type ModelRunner = (
  image: string,
  prompt: string,
  apiKey?: string,
  apiUrl?: string,
  model?: string,
  tools?: AIModelTool[]
) => Promise<AIModelResponse>;

const RUNNERS: Record<string, ModelRunner> = {
  gemini: geminiRunner,
  openai: openaiRunner,
  anthropic: anthropicRunner,
};

export default class AIModel {
  model: ModelRunner;

  private constructor(model: ModelRunner) {
    this.model = model;
  }

  static async create(modelValue: string): Promise<AIModel> {
    const matchedModel = findModelByValue(modelValue);
    const scriptKey = matchedModel?.modelScript ?? "gemini";
    const runner = RUNNERS[scriptKey] ?? RUNNERS.gemini;
    return new AIModel(runner);
  }

  async run(
    image: string,
    prompt: string,
    apiKey?: string,
    apiUrl?: string,
    model?: string,
    tools?: AIModelTool[]
  ): Promise<AIModelResponse> {
    return this.model(image, prompt, apiKey, apiUrl, model, tools);
  }
}
