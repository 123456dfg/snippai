export interface AIModelTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface AIModelToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AIModelResponse {
  content: string;
  toolCalls: AIModelToolCall[];
}
