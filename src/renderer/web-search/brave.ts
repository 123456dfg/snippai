import { WebSearchProvider } from "./base";

export class BraveSearchProvider extends WebSearchProvider {
  async search(query: string): Promise<string> {
    throw new Error(`Brave Search is not implemented yet and cannot run the query: ${query}`);
  }
}
