import { Pipe, pushOutbound } from "src/router/types";

export const dmFallbackPipe: Pipe = async (ctx) => {
  if (ctx.mutations.stopPipeline || ctx.event.type !== "dm_message" || !ctx.event.chatId) {
    return;
  }

  pushOutbound(ctx, {
    type: "sendMessage",
    chatId: ctx.event.chatId,
    text: "I did not match that yet. Try /help.",
  });
};

