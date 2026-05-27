import { Pipe } from "src/router/types";

export const loggingPipe: Pipe = async (ctx) => {
  ctx.logger.info("event.received", {
    eventType: ctx.event.type,
    eventId: ctx.event.eventId,
    userId: ctx.event.userId,
    chatId: ctx.event.chatId,
  });
};

