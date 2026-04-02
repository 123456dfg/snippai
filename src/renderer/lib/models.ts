import { decryptText, encryptText } from "./secureStorage";

export type ApiStyle = "openai" | "gemini";

export interface PromptOption {
  value: string;
  label: string;
  prompt: string;
}

export interface ManagedModel {
  value: string;
  label: string;
  provider: string;
  providerLabel: string;
  requireApiKey: boolean;
  requireBaseURL: boolean;
  modelScript: ApiStyle;
  modelName: string;
  apiUrl: string;
  isCustom?: boolean;
  encryptedApiKey?: string;
}

export interface ModelProvider {
  value: string;
  label: string;
  apiStyle: ApiStyle;
  apiUrl: string;
}

export interface CreateCustomModelInput {
  alias: string;
  provider: string;
  apiKey: string;
  modelName: string;
  apiUrl?: string;
}

export interface UpdateCustomModelInput extends CreateCustomModelInput {
  modelValue: string;
}

const CUSTOM_MODELS_STORAGE_KEY = "snippai_custom_models_v1";
const BUILTIN_API_KEY_STORAGE_KEY = "snippai_builtin_model_api_keys_v1";

export const CUSTOM_PROVIDER_VALUE = "custom";

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    value: "openai",
    label: "OpenAI",
    apiStyle: "openai",
    apiUrl: "https://api.openai.com/v1",
  },
  {
    value: "siliconflow",
    label: "硅基流动",
    apiStyle: "openai",
    apiUrl: "https://api.siliconflow.cn/v1",
  },
  {
    value: "deepseek",
    label: "DeepSeek",
    apiStyle: "openai",
    apiUrl: "https://api.deepseek.com/v1",
  },
  {
    value: "volcengine",
    label: "火山引擎",
    apiStyle: "openai",
    apiUrl: "https://ark.cn-beijing.volces.com/api/v3",
  },
  {
    value: "qwen",
    label: "千问",
    apiStyle: "openai",
    apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    value: "claude",
    label: "Claude(兼容模式)",
    apiStyle: "openai",
    apiUrl: "https://openrouter.ai/api/v1",
  },
  {
    value: "zhipu",
    label: "智谱",
    apiStyle: "openai",
    apiUrl: "https://open.bigmodel.cn/api/paas/v4",
  },
  {
    value: "google-gemini",
    label: "Google Gemini",
    apiStyle: "gemini",
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
  },
  {
    value: CUSTOM_PROVIDER_VALUE,
    label: "自定义",
    apiStyle: "openai",
    apiUrl: "",
  },
];

const DEFAULT_PROMPTS: PromptOption[] = [
  {
    value: "Auto",
    label: "Auto",
    prompt:
      "This is an image uploaded by a user, I need your help to analyze the content in the image. If the main content in the image is text, return OCR text only. If the main content is a mathematical formula, return Latex code only. If neither text nor formula is dominant, return a detailed image description.",
  },
  {
    value: "Formula",
    label: "Formula",
    prompt:
      "Please return the Latex code for this math formula (return only the Latex code corresponding to the formula, do not add additional descriptions).",
  },
  {
    value: "Text",
    label: "Text",
    prompt:
      "Please return the result of OCR text recognition (only return the recognized text, do not add other descriptions).",
  },
  {
    value: "Code",
    label: "Code",
    prompt:
      "Please return the content of the code in the picture (please describe in detail what the code in the picture does).",
  },
  {
    value: "Table",
    label: "Table",
    prompt: "Please return the contents of the table in the image, using Markdown format.",
  },
  {
    value: "Solve",
    label: "Solve",
    prompt: "Please return the answer to the question in the picture.",
  },
  {
    value: "Image",
    label: "Image",
    prompt: "Please return a detailed description of the image.",
  },
  {
    value: "Color",
    label: "Color",
    prompt: "Please return the color information in the image, use #RRGGBB format.",
  },
];

export const promptOptions: Record<string, PromptOption[]> = {
  default: DEFAULT_PROMPTS,
  gemini: DEFAULT_PROMPTS,
  gpt4: DEFAULT_PROMPTS,
};

export const models: ManagedModel[] = [
  {
    value: "gemini",
    label: "Google Gemini",
    provider: "gemini-proxy",
    providerLabel: "Gemini Proxy",
    requireApiKey: false,
    requireBaseURL: false,
    modelScript: "gemini",
    modelName: "gemini-1.5-pro",
    apiUrl: "https://s.global.ssl.fastly.net/v1beta/models/{model}:generateContent",
  },
  {
    value: "gpt4",
    label: "OpenAI GPT-4o",
    provider: "openai",
    providerLabel: "OpenAI",
    requireApiKey: true,
    requireBaseURL: false,
    modelScript: "openai",
    modelName: "gpt-4o",
    apiUrl: "https://api.openai.com/v1",
  },
];

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toManagedModel(item: Partial<ManagedModel>): ManagedModel | null {
  if (!item.value || !item.label || !item.modelName || !item.apiUrl) {
    return null;
  }

  const modelScript = item.modelScript === "gemini" ? "gemini" : "openai";
  return {
    value: item.value,
    label: item.label,
    provider: item.provider ?? CUSTOM_PROVIDER_VALUE,
    providerLabel: item.providerLabel ?? "自定义",
    requireApiKey: true,
    requireBaseURL: false,
    modelScript,
    modelName: item.modelName,
    apiUrl: item.apiUrl,
    isCustom: true,
    encryptedApiKey: item.encryptedApiKey ?? "",
  };
}

export function inferApiStyleFromUrl(apiUrl: string): ApiStyle {
  const normalized = apiUrl.toLowerCase();
  if (
    normalized.includes("generativelanguage.googleapis.com") ||
    normalized.includes(":generatecontent")
  ) {
    return "gemini";
  }
  return "openai";
}

export function getProviderByValue(providerValue: string): ModelProvider | undefined {
  return MODEL_PROVIDERS.find((provider) => provider.value === providerValue);
}

export function loadCustomModels(): ManagedModel[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const parsed = parseJson<Partial<ManagedModel>[]>(
    localStorage.getItem(CUSTOM_MODELS_STORAGE_KEY),
    []
  );

  return parsed
    .map((item) => toManagedModel(item))
    .filter((item): item is ManagedModel => item !== null);
}

export function saveCustomModels(customModels: ManagedModel[]): void {
  if (!canUseLocalStorage()) {
    return;
  }
  localStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(customModels));
}

export function getAllModels(): ManagedModel[] {
  return [...models, ...loadCustomModels()];
}

export function findModelByValue(
  modelValue: string,
  modelList: ManagedModel[] = getAllModels()
): ManagedModel | undefined {
  return modelList.find((item) => item.value === modelValue);
}

export function getPromptOptions(modelValue: string): PromptOption[] {
  return promptOptions[modelValue] ?? promptOptions.default;
}

export function resolveApiUrlForModel(model: ManagedModel): string {
  const provider = getProviderByValue(model.provider);
  if (provider && provider.value !== CUSTOM_PROVIDER_VALUE && provider.apiUrl) {
    return provider.apiUrl;
  }
  return model.apiUrl;
}

function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}

function loadBuiltinApiKeyMap(): Record<string, string> {
  if (!canUseLocalStorage()) {
    return {};
  }
  return parseJson<Record<string, string>>(
    localStorage.getItem(BUILTIN_API_KEY_STORAGE_KEY),
    {}
  );
}

function saveBuiltinApiKeyMap(map: Record<string, string>): void {
  if (!canUseLocalStorage()) {
    return;
  }
  localStorage.setItem(BUILTIN_API_KEY_STORAGE_KEY, JSON.stringify(map));
}

export async function getModelApiKey(
  modelValue: string,
  modelList: ManagedModel[] = getAllModels()
): Promise<string> {
  const model = findModelByValue(modelValue, modelList);
  if (!model) {
    return "";
  }

  if (model.isCustom) {
    return decryptText(model.encryptedApiKey ?? "");
  }

  const keyMap = loadBuiltinApiKeyMap();
  return decryptText(keyMap[modelValue] ?? "");
}

export async function saveModelApiKey(
  modelValue: string,
  apiKey: string,
  modelList: ManagedModel[] = getAllModels()
): Promise<ManagedModel[]> {
  const model = findModelByValue(modelValue, modelList);
  if (!model) {
    return modelList;
  }

  const encrypted = await encryptText(apiKey.trim());
  if (model.isCustom) {
    const customModels = loadCustomModels();
    const updated = customModels.map((item) => {
      if (item.value === modelValue) {
        return { ...item, encryptedApiKey: encrypted };
      }
      return item;
    });
    saveCustomModels(updated);
    return getAllModels();
  }

  const keyMap = loadBuiltinApiKeyMap();
  keyMap[modelValue] = encrypted;
  saveBuiltinApiKeyMap(keyMap);
  return modelList;
}

export async function addCustomModel(input: CreateCustomModelInput): Promise<ManagedModel[]> {
  const alias = input.alias.trim();
  const modelName = input.modelName.trim();
  const apiKey = input.apiKey.trim();

  if (!alias || !modelName || !apiKey) {
    throw new Error("请填写完整的模型别名、API Key 和模型名称。");
  }

  const provider = getProviderByValue(input.provider);
  const isCustomProvider = input.provider === CUSTOM_PROVIDER_VALUE || !provider;
  const providerLabel = provider?.label ?? "自定义";
  const providerApiStyle = provider?.apiStyle ?? "openai";
  const resolvedApiUrl = isCustomProvider
    ? normalizeApiUrl(input.apiUrl ?? "")
    : normalizeApiUrl(provider.apiUrl);

  if (!resolvedApiUrl) {
    throw new Error("请填写有效的模型 API URL。");
  }

  const modelScript = isCustomProvider ? inferApiStyleFromUrl(resolvedApiUrl) : providerApiStyle;
  const encryptedApiKey = await encryptText(apiKey);

  const customModels = loadCustomModels();
  const customModel: ManagedModel = {
    value: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: alias,
    provider: input.provider,
    providerLabel,
    requireApiKey: true,
    requireBaseURL: false,
    modelScript,
    modelName,
    apiUrl: resolvedApiUrl,
    isCustom: true,
    encryptedApiKey,
  };

  customModels.push(customModel);
  saveCustomModels(customModels);
  return getAllModels();
}

export async function updateCustomModel(input: UpdateCustomModelInput): Promise<ManagedModel[]> {
  const customModels = loadCustomModels();
  const targetIndex = customModels.findIndex((item) => item.value === input.modelValue);
  if (targetIndex < 0) {
    throw new Error("未找到需要编辑的自定义模型。");
  }

  const alias = input.alias.trim();
  const modelName = input.modelName.trim();
  const apiKey = input.apiKey.trim();

  if (!alias || !modelName || !apiKey) {
    throw new Error("请填写完整的模型别名、API Key 和模型名称。");
  }

  const provider = getProviderByValue(input.provider);
  const isCustomProvider = input.provider === CUSTOM_PROVIDER_VALUE || !provider;
  const providerLabel = provider?.label ?? "自定义";
  const providerApiStyle = provider?.apiStyle ?? "openai";
  const resolvedApiUrl = isCustomProvider
    ? normalizeApiUrl(input.apiUrl ?? "")
    : normalizeApiUrl(provider.apiUrl);

  if (!resolvedApiUrl) {
    throw new Error("请填写有效的模型 API URL。");
  }

  const modelScript = isCustomProvider ? inferApiStyleFromUrl(resolvedApiUrl) : providerApiStyle;
  const encryptedApiKey = await encryptText(apiKey);
  const currentModel = customModels[targetIndex];

  customModels[targetIndex] = {
    ...currentModel,
    label: alias,
    provider: input.provider,
    providerLabel,
    requireApiKey: true,
    requireBaseURL: false,
    modelScript,
    modelName,
    apiUrl: resolvedApiUrl,
    isCustom: true,
    encryptedApiKey,
  };

  saveCustomModels(customModels);
  return getAllModels();
}

export function deleteCustomModel(modelValue: string): ManagedModel[] {
  const customModels = loadCustomModels();
  const nextModels = customModels.filter((item) => item.value !== modelValue);
  if (nextModels.length === customModels.length) {
    return getAllModels();
  }
  saveCustomModels(nextModels);
  return getAllModels();
}
