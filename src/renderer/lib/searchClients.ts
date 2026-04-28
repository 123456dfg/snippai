import { decryptText, encryptText } from "./secureStorage";

export type SearchProvider = "tavily";

export interface SearchClient {
  id: string;
  provider: SearchProvider;
  encryptedApiKey: string;
  isDefault: boolean;
}

export interface AddSearchClientInput {
  provider: SearchProvider;
  apiKey: string;
  isDefault: boolean;
}

export interface UpdateSearchClientInput extends AddSearchClientInput {
  id: string;
}

const SEARCH_CLIENTS_STORAGE_KEY = "snippai_search_clients_v1";

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

export function loadSearchClients(): SearchClient[] {
  if (!canUseLocalStorage()) {
    return [];
  }
  const parsed = parseJson<SearchClient[]>(localStorage.getItem(SEARCH_CLIENTS_STORAGE_KEY), []);
  return parsed.filter(
    (item) => item && typeof item.id === "string" && typeof item.provider === "string"
  );
}

function saveSearchClients(clients: SearchClient[]): void {
  if (!canUseLocalStorage()) {
    return;
  }
  localStorage.setItem(SEARCH_CLIENTS_STORAGE_KEY, JSON.stringify(clients));
}

function normalizeDefault(clients: SearchClient[]): SearchClient[] {
  const next = [...clients];
  if (next.length === 0) {
    return next;
  }

  const defaultIndexes = next
    .map((item, index) => ({ isDefault: item.isDefault, index }))
    .filter((item) => item.isDefault)
    .map((item) => item.index);

  if (defaultIndexes.length === 0) {
    next[0] = { ...next[0], isDefault: true };
    return next;
  }

  const primaryIndex = defaultIndexes[0];
  return next.map((item, index) => ({
    ...item,
    isDefault: index === primaryIndex,
  }));
}

export function replaceSearchClients(clients: SearchClient[]): SearchClient[] {
  const normalized = normalizeDefault(clients);
  saveSearchClients(normalized);
  return normalized;
}

export async function addSearchClient(input: AddSearchClientInput): Promise<SearchClient[]> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new Error("Please enter a search client API key.");
  }

  const encryptedApiKey = await encryptText(apiKey);
  const current = loadSearchClients();

  const next = current.map((item) => ({
    ...item,
    isDefault: input.isDefault ? false : item.isDefault,
  }));

  const client: SearchClient = {
    id: `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    provider: input.provider,
    encryptedApiKey,
    isDefault: input.isDefault,
  };

  next.push(client);

  if (!next.some((item) => item.isDefault)) {
    next[0].isDefault = true;
  }

  const normalized = normalizeDefault(next);
  saveSearchClients(normalized);
  return normalized;
}

export async function updateSearchClient(input: UpdateSearchClientInput): Promise<SearchClient[]> {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new Error("Please enter a search client API key.");
  }

  const current = loadSearchClients();
  const targetIndex = current.findIndex((item) => item.id === input.id);
  if (targetIndex < 0) {
    throw new Error("Could not find the search client to edit.");
  }

  const encryptedApiKey = await encryptText(apiKey);
  let next = current.map((item, index) => {
    if (index !== targetIndex) {
      return {
        ...item,
        isDefault: input.isDefault ? false : item.isDefault,
      };
    }
    return {
      ...item,
      provider: input.provider,
      encryptedApiKey,
      isDefault: input.isDefault,
    };
  });

  next = normalizeDefault(next);
  saveSearchClients(next);
  return next;
}

export function deleteSearchClient(id: string): SearchClient[] {
  const current = loadSearchClients();
  const next = current.filter((item) => item.id !== id);
  const normalized = normalizeDefault(next);
  saveSearchClients(normalized);
  return normalized;
}

export function getDefaultSearchClient(clients: SearchClient[] = loadSearchClients()): SearchClient | undefined {
  return clients.find((item) => item.isDefault);
}

export async function getSearchClientApiKey(clientId: string): Promise<string> {
  const clients = loadSearchClients();
  const client = clients.find((item) => item.id === clientId);
  if (!client) {
    return "";
  }
  return decryptText(client.encryptedApiKey);
}
