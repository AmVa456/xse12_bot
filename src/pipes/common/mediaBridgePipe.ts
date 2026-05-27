import { Pipe, pushOutbound } from "src/router/types";
import { extractMediaRefFromUpdate } from "src/utils/media";

function currentMessageId(raw: { message?: { message_id?: number }; edited_message?: { message_id?: number } }): number | undefined {
  return raw.message?.message_id || raw.edited_message?.message_id;
}

export const mediaBridgePipe: Pipe = async (ctx) => {
  if (ctx.mutations.stopPipeline || !ctx.event.chatId) {
    return;
  }

  const media = extractMediaRefFromUpdate(ctx.event.raw);
  if (!media) {
    return;
  }

  const setting = await ctx.db.getSetting(`media_bridge:${ctx.event.chatId}`);
  if (!setting?.value) {
    return;
  }

  const targetChatId = Number.parseInt(setting.value, 10);
  if (!Number.isFinite(targetChatId) || targetChatId === ctx.event.chatId) {
    return;
  }

  const messageId = currentMessageId(ctx.event.raw);
  if (!messageId) {
    return;
  }

  pushOutbound(ctx, {
    type: "copyMessage",
    chatId: targetChatId,
    fromChatId: ctx.event.chatId,
    messageId,
  });
};

