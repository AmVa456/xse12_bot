import { Pipe } from "src/router/types";

export const groupAnalyticsPipe: Pipe = async (ctx) => {
  if (ctx.event.type !== "group_message") {
    return;
  }

  ctx.logger.info("group.analytics", {
    chatId: ctx.event.chatId,
    matchedMention: ctx.meta.mentionMatched,
  });
};

