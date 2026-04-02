import { findModelByValue } from "../lib/models";
import type { AIModelResponse, AIModelTool } from "./types";

type ModelRunner = (
  image: string,
  prompt: string,
  apiKey?: string,
  apiUrl?: string,
  model?: string,
  tools?: AIModelTool[]
) => Promise<AIModelResponse>;

export default class AIModel {
  model: ModelRunner;

  private constructor(model: ModelRunner) {
    this.model = model;
  }

  static async create(modelValue: string): Promise<AIModel> {
    const matchedModel = findModelByValue(modelValue);
    const importPath = matchedModel?.modelScript ?? "gemini";
    const module = await import(`./model-${importPath}.ts`);
    return new AIModel(module.default as ModelRunner);
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
