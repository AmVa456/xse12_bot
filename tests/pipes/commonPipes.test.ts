import test from "node:test";
import assert from "node:assert/strict";
import { commandPipe } from "src/pipes/common/commandPipe";
import { createDbClient } from "src/state/dbClient";
import { createLogger } from "src/utils/logger";

test("commandPipe handles /help", async () => {
  const ctx = {
    event: {
      eventId: "evt_1",
      updateId: 1,
      type: "dm_message" as const,
      chatId: 4,
      chatType: "private",
      userId: 4,
      text: "/help",
      timestamp: 1,
      raw: { update_id: 1 },
    },
    config: {
      nodeEnv: "test",
      port: 0,
      botToken: "token",
      webhookUrl: "https://example.com",
      webhookSecret: "secret",
      dbUrl: "sqlite://./xseries.db",
      redisUrl: undefined,
      localBotApiBaseUrl: "http://localhost:8081",
      autoSetWebhook: false,
      telegramLoginBotUsername: "xse12_bot",
      telegramLoginAuthDomain: "example.com",
      telegramLoginCallbackUrl: "https://example.com/auth/telegram/callback",
      telegramLoginMaxAgeSeconds: 300,
      sessionSecret: "s",
      adminTelegramIds: [],
      geminiModel: "gemini-1.5-flash",
    },
    logger: createLogger(),
    db: createDbClient("sqlite://./xseries.db"),
    tg: {
      getMe: async () => ({ id: 1, is_bot: true, first_name: "bot" }),
      sendMessage: async () => ({ message_id: 1, date: 1, chat: { id: 1, type: "private" } }),
      editMessageText: async () => ({ message_id: 1, date: 1, chat: { id: 1, type: "private" } }),
      answerInlineQuery: async () => true,
      setWebhook: async () => true,
      setMyCommands: async () => true,
      sendChatAction: async () => true,
      sendPhoto: async () => ({ message_id: 1, date: 1, chat: { id: 1, type: "private" } }),
      sendVideo: async () => ({ message_id: 1, date: 1, chat: { id: 1, type: "private" } }),
      sendDocument: async () => ({ message_id: 1, date: 1, chat: { id: 1, type: "private" } }),
      copyMessage: async () => 1,
      answerCallbackQuery: async () => true,
    },
    mutations: { outbound: [] as never[] },
    meta: {},
  };

  await commandPipe(ctx);

  assert.equal(ctx.mutations.stopPipeline, true);
  assert.equal(ctx.mutations.outbound.length > 0, true);
});
