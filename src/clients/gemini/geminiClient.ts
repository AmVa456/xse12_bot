import { GeminiSdkClient } from "src/clients/gemini/geminiSdkClient";

export type GeminiRole = "user" | "assistant";

export type GeminiTurn = {
  role: GeminiRole;
  text: string;
};

export type GeminiClient = {
  generateReply(history: GeminiTurn[], prompt: string): Promise<string>;
};

export function createGeminiClient(apiKey: string, model: string, systemPrompt?: string): GeminiClient {
  const sdkClient = new GeminiSdkClient(apiKey, model, systemPrompt);

  return {
    async generateReply(history: GeminiTurn[], prompt: string): Promise<string> {
      const turns = history.map((turn) => ({
        role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
        text: turn.text,
      }));

      return sdkClient.generateText(turns, prompt);
    },
  };
}

