import { Pipe } from "src/router/types";

export const authPipe: Pipe = async (ctx) => {
  if (!ctx.event.userId) {
    return;
  }

  if (ctx.config.authorizedMasterId && ctx.event.userId !== ctx.config.authorizedMasterId) {
    await ctx.db.addAuditEntry({
      id: `sec_${Date.now()}`,
      actorUserId: `u_${ctx.event.userId}`,
      action: "security.violation",
      metadata: { userId: ctx.event.userId, reason: "unauthorized_master_access" },
      createdAt: new Date().toISOString(),
    });
    throw new Error("SECURITY_VIOLATION_TERMINATE");
  }

  const user = await ctx.db.getOrCreateUserByTelegramId(ctx.event.userId);

  if (ctx.config.adminTelegramIds.includes(ctx.event.userId) && !user.roles.includes("admin")) {
    user.roles = [...user.roles, "admin"];
  }

  ctx.userState = user;
  ctx.meta.isAdmin = user.roles.includes("admin");
};

