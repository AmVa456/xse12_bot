import { Pipe } from "src/router/types";

export const inlineRouterPipe: Pipe = async (ctx) => {
  if (ctx.event.type !== "inline_query") {
    return;
  }

  const query = (ctx.event.text || "").trim();
  if (!ctx.sessionState) {
    return;
  }

  if (query.startsWith("help")) {
    ctx.meta.inlineMode = "help";
    return;
  }

  if (query.startsWith("echo")) {
    ctx.meta.inlineMode = "echo";
    return;
  }

  ctx.meta.inlineMode = "default";
};

