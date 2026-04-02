import type { SearchProvider } from "../lib/searchClients";
import { WebSearchProvider } from "./base";
import { TavilySearchProvider } from "./tavily";

export function createWebSearchProvider(provider: SearchProvider, apiKey: string): WebSearchProvider {
  switch (provider) {
    case "tavily":
      return new TavilySearchProvider(apiKey);
    default:
      throw new Error(`不支持的搜索提供商：${provider}`);
  }
}
