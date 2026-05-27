import { Pipe } from "src/router/types";

export const errorPipe: Pipe = async (ctx) => {
  if (!ctx.event.chatId) {
    return;
  }

  ctx.mutations.outbound.push({
    type: "sendMessage",
    chatId: ctx.event.chatId,
    text: "An error occurred while processing your request.",
  });
};

