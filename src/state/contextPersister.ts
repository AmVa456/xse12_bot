import { RouteContext } from "src/router/types";

export async function persistContext(ctx: RouteContext): Promise<void> {
  if (ctx.mutations.userState) {
    await ctx.db.upsertUser(ctx.mutations.userState);
  } else if (ctx.userState) {
    await ctx.db.upsertUser(ctx.userState);
  }

  if (ctx.mutations.sessionState) {
    await ctx.db.upsertSession(ctx.mutations.sessionState);
  } else if (ctx.sessionState) {
    ctx.sessionState.updatedAt = new Date().toISOString();
    await ctx.db.upsertSession(ctx.sessionState);
  }
}

