import type { SearchProvider } from "../lib/searchClients";
import { WebSearchProvider } from "./base";
import { TavilySearchProvider } from "./tavily";

export function createWebSearchProvider(provider: SearchProvider, apiKey: string): WebSearchProvider {
  switch (provider) {
    case "tavily":
      return new TavilySearchProvider(apiKey);
    default:
      throw new Error(`Unsupported search provider: ${provider}`);
  }
}
