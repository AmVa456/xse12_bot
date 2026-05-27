import { Pipe } from "src/router/types";

export const mentionPipe: Pipe = async (ctx) => {
  if (ctx.event.type !== "group_message") {
    return;
  }

  const text = ctx.event.text || "";
  const botRef = ctx.config.telegramLoginBotUsername.toLowerCase();
  const isMention = text.toLowerCase().includes(`@${botRef}`) || text.toLowerCase().includes("xseries");

  ctx.meta.mentionMatched = isMention;
  if (!isMention) {
    ctx.mutations.stopPipeline = true;
  }
};

