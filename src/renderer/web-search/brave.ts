import { WebSearchProvider } from "./base";

export class BraveSearchProvider extends WebSearchProvider {
  async search(query: string): Promise<string> {
    throw new Error(`Brave Search 尚未实现，无法执行查询：${query}`);
  }
}
