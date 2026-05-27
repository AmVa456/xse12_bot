import { Pipe, pushOutbound } from "src/router/types";

export const moderationPipe: Pipe = async (ctx) => {
  if (ctx.event.type !== "group_message" || ctx.mutations.stopPipeline || !ctx.event.chatId) {
    return;
  }

  const text = (ctx.event.text || "").toLowerCase();
  if (text.includes("spam")) {
    pushOutbound(ctx, {
      type: "sendMessage",
      chatId: ctx.event.chatId,
      text: "Please avoid spam content.",
    });
    ctx.mutations.stopPipeline = true;
  }
};

