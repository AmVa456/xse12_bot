import { GoogleGenAI, Type } from "@google/genai";

export type GeminiDialogueTurn = {
  role: "user" | "model";
  text: string;
};

export type ReasoningResult = {
  reasoning_steps: string[];
  final_synthesis: string;
};

export const REASONING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reasoning_steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    final_synthesis: {
      type: Type.STRING,
    },
  },
  required: ["reasoning_steps", "final_synthesis"],
};

function toContents(turns: GeminiDialogueTurn[]): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  return turns
    .filter((turn) => turn.text.trim().length > 0)
    .map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    }));
}

function parseReasoning(text: string): ReasoningResult {
  try {
    const payload = JSON.parse(text) as Partial<ReasoningResult>;
    const steps = Array.isArray(payload.reasoning_steps)
      ? payload.reasoning_steps.filter((item): item is string => typeof item === "string")
      : [];
    const synthesis = typeof payload.final_synthesis === "string" ? payload.final_synthesis : "";
    if (!synthesis) {
      throw new Error("Missing final_synthesis.");
    }
    return {
      reasoning_steps: steps,
      final_synthesis: synthesis,
    };
  } catch (error) {
    throw new Error(`Unable to parse structured Gemini response: ${error instanceof Error ? error.message : "Unknown parse error"}`);
  }
}

export class GeminiSdkClient {
  private ai: GoogleGenAI;
  private model: string;
  private systemInstruction?: string;

  constructor(apiKey: string, model: string, systemInstruction?: string) {
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY for Gemini SDK client.");
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
    this.systemInstruction = systemInstruction;
  }

  async generateText(turns: GeminiDialogueTurn[], prompt: string, overrideSystemInstruction?: string): Promise<string> {
    const contents = toContents([...turns, { role: "user", text: prompt }]);
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: overrideSystemInstruction || this.systemInstruction,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty text response.");
    }

    return text;
  }

  async generateReasoned(turns: GeminiDialogueTurn[], prompt: string, overrideSystemInstruction?: string): Promise<ReasoningResult> {
    const contents = toContents([...turns, { role: "user", text: prompt }]);
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: overrideSystemInstruction || this.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: REASONING_SCHEMA,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty structured response.");
    }

    return parseReasoning(text);
  }
}

