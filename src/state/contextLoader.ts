import { RouteContext } from "src/router/types";
import { SessionState } from "src/state/models";

function buildSessionKey(ctx: RouteContext): string {
  const user = ctx.event.userId ? `u_${ctx.event.userId}` : "u_unknown";
  const chat = ctx.event.chatId ? `c_${ctx.event.chatId}` : "c_none";
  return `${user}:${chat}`;
}

export async function loadContext(ctx: RouteContext): Promise<void> {
  if (ctx.event.userId) {
    ctx.userState = await ctx.db.getOrCreateUserByTelegramId(ctx.event.userId);
  }

  if (ctx.event.chatId && ctx.event.chatType) {
    ctx.chatState = {
      chatId: ctx.event.chatId,
      chatType: ctx.event.chatType,
      updatedAt: new Date().toISOString(),
    };
  }

  const sessionKey = buildSessionKey(ctx);
  const existing = await ctx.db.getSession(sessionKey);
  ctx.sessionState =
    existing ||
    ({
      key: sessionKey,
      userId: ctx.userState?.id,
      data: {},
      updatedAt: new Date().toISOString(),
    } as SessionState);
}

