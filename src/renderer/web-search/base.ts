export abstract class WebSearchProvider {
  abstract search(query: string): Promise<string>;
}
