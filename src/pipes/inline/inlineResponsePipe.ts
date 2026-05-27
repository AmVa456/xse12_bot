import { Pipe, pushOutbound } from "src/router/types";

export const inlineResponsePipe: Pipe = async (ctx) => {
  if (ctx.event.type !== "inline_query" || !ctx.event.inlineQueryId) {
    return;
  }

  const query = (ctx.event.text || "").trim();
  let title = "xser12 result";
  let text = `Query: ${query || "(empty)"}`;

  if (ctx.meta.inlineMode === "help") {
    title = "Inline help";
    text = "Try: echo hello";
  } else if (ctx.meta.inlineMode === "echo") {
    title = "Echo";
    text = query.replace(/^echo\s*/i, "") || "(empty)";
  }

  pushOutbound(ctx, {
    type: "answerInlineQuery",
    inlineQueryId: ctx.event.inlineQueryId,
    results: [
      {
        id: `${Date.now()}`,
        title,
        messageText: text,
      },
    ],
    cacheTime: 1,
    isPersonal: true,
  });

  ctx.mutations.stopPipeline = true;
};

