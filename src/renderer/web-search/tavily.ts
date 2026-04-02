import { WebSearchProvider } from "./base";

interface TavilyResultItem {
  title?: string;
  url?: string;
  content?: string;
}

interface TavilyResponse {
  results?: TavilyResultItem[];
  error?: string;
}

export class TavilySearchProvider extends WebSearchProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<string> {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        search_depth: "advanced",
        max_results: 5,
      }),
    });

    const data = (await response.json()) as TavilyResponse;
    if (!response.ok) {
      throw new Error(data.error ?? "Tavily 搜索失败。");
    }

    const results = data.results ?? [];
    if (!results.length) {
      return `查询：${query}\n未检索到结果。`;
    }

    const lines = results.map((item, index) => {
      const title = item.title ?? "无标题";
      const url = item.url ?? "";
      const content = item.content ?? "";
      return `${index + 1}. ${title}\n${url}\n${content}`;
    });

    return `查询：${query}\n${lines.join("\n\n")}`;
  }
}
