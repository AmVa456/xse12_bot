import { AnswerInlineQueryRequest } from "src/clients/telegram/telegramTypes";
import { normalizeUpdate } from "src/normalization/updateNormalizer";
import { getAllBuckets, getBucketForEvent } from "src/router/bucketRegistry";
import { isPipeHalted } from "src/router/pipeControls";
import { createBaseContext, RouteContext, RouterDependencies } from "src/router/types";
import { loadContext } from "src/state/contextLoader";
import { persistContext } from "src/state/contextPersister";
import { errorPipe } from "src/pipes/common/errorPipe";

async function dispatchOutbound(ctx: RouteContext): Promise<void> {
  for (const op of ctx.mutations.outbound) {
    if (op.type === "sendMessage") {
      await ctx.tg.sendMessage({
        chat_id: op.chatId,
        text: op.text,
        parse_mode: op.parseMode,
      });
      continue;
    }

    if (op.type === "editMessageText") {
      await ctx.tg.editMessageText({
        chat_id: op.chatId,
        message_id: op.messageId,
        text: op.text,
        parse_mode: op.parseMode,
      });
      continue;
    }

    if (op.type === "answerCallbackQuery") {
      await ctx.tg.answerCallbackQuery(op.callbackQueryId, op.text);
      continue;
    }

    if (op.type === "answerInlineQuery") {
      const payload: AnswerInlineQueryRequest = {
        inline_query_id: op.inlineQueryId,
        cache_time: op.cacheTime,
        is_personal: op.isPersonal,
        results: op.results.map((result) => ({
          type: "article",
          id: result.id,
          title: result.title,
          description: result.description,
          input_message_content: {
            message_text: result.messageText,
          },
        })),
      };
      await ctx.tg.answerInlineQuery(payload);
      continue;
    }

    if (op.type === "sendChatAction") {
      await ctx.tg.sendChatAction({
        chat_id: op.chatId,
        action: op.action,
      });
      continue;
    }

    if (op.type === "sendPhoto") {
      await ctx.tg.sendPhoto({
        chat_id: op.chatId,
        photo: op.fileId,
        caption: op.caption,
      });
      continue;
    }

    if (op.type === "sendVideo") {
      await ctx.tg.sendVideo({
        chat_id: op.chatId,
        video: op.fileId,
        caption: op.caption,
      });
      continue;
    }

    if (op.type === "sendDocument") {
      await ctx.tg.sendDocument({
        chat_id: op.chatId,
        document: op.fileId,
        caption: op.caption,
      });
      continue;
    }

    if (op.type === "copyMessage") {
      await ctx.tg.copyMessage({
        chat_id: op.chatId,
        from_chat_id: op.fromChatId,
        message_id: op.messageId,
      });
    }
  }
}

export async function routeEvent(
  event: Parameters<typeof createBaseContext>[0],
  deps: RouterDependencies,
  botToken?: string
): Promise<RouteContext> {
  const ctx = createBaseContext(event, deps);
  await loadContext(ctx);

  let bucket = getBucketForEvent(event);

  if (botToken) {
    const bots = await ctx.db.listBots();
    const bot = bots.find((b) => b.token === botToken);
    if (bot?.routingBucket) {
      const allBuckets = getAllBuckets();
      const dynamicBucket = allBuckets.find((b) => b.name === bot.routingBucket);
      if (dynamicBucket) {
        bucket = dynamicBucket;
        ctx.logger.info("router.bucket.dynamic", {
          botId: bot.botId,
          bucket: bucket.name,
        });
      }
    }
  }

  ctx.logger.info("router.bucket.selected", { bucket: bucket.name, eventType: event.type });

  try {
    for (const pipe of bucket.pipes) {
      const pipeName = pipe.name || "anonymousPipe";
      const scopedPipeId = `${bucket.name}.${pipeName}`.toLowerCase();
      const bucketId = bucket.name.toLowerCase();
      if (isPipeHalted(scopedPipeId) || isPipeHalted(bucketId)) {
        ctx.logger.warn("router.pipe.halted", {
          bucket: bucket.name,
          pipe: pipeName,
        });
        continue;
      }

      await pipe(ctx);
      if (ctx.mutations.stopPipeline) {
        break;
      }
    }
  } catch (error) {
    ctx.logger.error("router.pipe.error", {
      message: error instanceof Error ? error.message : "Unknown error",
      bucket: bucket.name,
    });
    await errorPipe(ctx);
  }

  await persistContext(ctx);
  await dispatchOutbound(ctx);

  return ctx;
}

export async function processUpdate(
  update: Parameters<typeof normalizeUpdate>[0],
  deps: RouterDependencies,
  botToken?: string
): Promise<RouteContext> {
  const event = normalizeUpdate(update);
  return routeEvent(event, deps, botToken);
}

export type { RouterDependencies, RouteContext } from "src/router/types";
export { pushOutbound } from "src/router/types";
