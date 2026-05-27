import { Pipe } from "src/router/types";

export const inlineAuthPipe: Pipe = async (ctx) => {
  if (!ctx.event.userId) {
    return;
  }

  ctx.userState = await ctx.db.getOrCreateUserByTelegramId(ctx.event.userId);
};

