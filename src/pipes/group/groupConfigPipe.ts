import { Pipe } from "src/router/types";

export const groupConfigPipe: Pipe = async (ctx) => {
  if (ctx.event.type !== "group_message") {
    return;
  }

  const lang = await ctx.db.getSetting(`group:${ctx.event.chatId}:lang`);
  ctx.meta.inlineMode = lang?.value || "en";
};

