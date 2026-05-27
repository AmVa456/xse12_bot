import { Pipe, pushOutbound } from "src/router/types";
import { GeminiDialogueTurn, GeminiSdkClient } from "src/clients/gemini/geminiSdkClient";

type SessionHistoryItem = {
  role: "user" | "model";
  text: string;
};

function toSessionHistory(value: unknown): SessionHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }
      const role = (entry as { role?: unknown }).role;
      const text = (entry as { text?: unknown }).text;
      if ((role !== "user" && role !== "model") || typeof text !== "string") {
        return undefined;
      }
      return { role, text };
    })
    .filter((entry): entry is SessionHistoryItem => Boolean(entry));
}

export const dmConversationPipe: Pipe = async (ctx) => {
  if (ctx.mutations.stopPipeline || ctx.event.type !== "dm_message") {
    return;
  }

  const text = (ctx.event.text || "").trim();
  if (!text || text.startsWith("/")) {
    return;
  }

  if (!ctx.config.geminiApiKey) {
    if (ctx.event.chatId) {
      pushOutbound(ctx, {
        type: "sendMessage",
        chatId: ctx.event.chatId,
        text: "Gemini is not configured yet. Set GEMINI_API_KEY in .env.",
      });
    }
    ctx.mutations.stopPipeline = true;
    return;
  }

  ctx.sessionState = ctx.sessionState || {
    key: `u_${ctx.event.userId || "unknown"}:c_${ctx.event.chatId || "none"}`,
    data: {},
    updatedAt: new Date().toISOString(),
  };

  const history = toSessionHistory(ctx.sessionState.data.gemini_history).slice(-20);
  const mappedHistory: GeminiDialogueTurn[] = history.map((turn) => ({
    role: turn.role,
    text: turn.text,
  }));

  if (ctx.event.chatId && text.trim().length > 0) {
    pushOutbound(ctx, {
      type: "sendChatAction",
      chatId: ctx.event.chatId,
      action: "typing",
    });
  }

  try {
    const client = new GeminiSdkClient(ctx.config.geminiApiKey, ctx.config.geminiModel, ctx.config.geminiSystemPrompt);
    const reply = await client.generateText(mappedHistory, text);

    const updatedHistory: SessionHistoryItem[] = [
      ...history,
      { role: "user" as const, text },
      { role: "model" as const, text: reply },
    ].slice(-20);
    ctx.sessionState.data.gemini_history = updatedHistory;
    ctx.sessionState.updatedAt = new Date().toISOString();
    ctx.mutations.sessionState = ctx.sessionState;

    if (ctx.event.chatId) {
      pushOutbound(ctx, {
        type: "sendMessage",
        chatId: ctx.event.chatId,
        text: reply,
      });
    }
  } catch (error) {
    ctx.logger.error("dm.gemini.error", {
      message: error instanceof Error ? error.message : "Unknown Gemini error",
    });
    if (ctx.event.chatId) {
      pushOutbound(ctx, {
        type: "sendMessage",
        chatId: ctx.event.chatId,
        text: `Gemini request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  ctx.mutations.stopPipeline = true;
};

