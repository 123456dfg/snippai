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
      throw new Error(data.error ?? "Tavily search failed.");
    }

    const results = data.results ?? [];
    if (!results.length) {
      return `Query: ${query}\nNo results found.`;
    }

    const lines = results.map((item, index) => {
      const title = item.title ?? "Untitled";
      const url = item.url ?? "";
      const content = item.content ?? "";
      return `${index + 1}. ${title}\n${url}\n${content}`;
    });

    return `Query: ${query}\n${lines.join("\n\n")}`;
  }
}
