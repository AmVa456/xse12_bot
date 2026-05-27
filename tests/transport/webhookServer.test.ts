import test from "node:test";
import assert from "node:assert/strict";
import { startWebhookServer } from "src/transport/webhookServer";
import { createDbClient } from "src/state/dbClient";
import { createLogger } from "src/utils/logger";

test("webhook rejects invalid secret", async () => {
  const server = await startWebhookServer({
    config: {
      nodeEnv: "test",
      port: 8099,
      botToken: "token",
      webhookUrl: "https://example.com/telegram/webhook",
      webhookSecret: "expected",
      dbUrl: "sqlite://./xseries.db",
      redisUrl: undefined,
      localBotApiBaseUrl: "https://api.telegram.org",
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
  });

  const res = await fetch("http://127.0.0.1:8099/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": "invalid",
    },
    body: JSON.stringify({ update_id: 1 }),
  });

  assert.equal(res.status, 401);
  await server.close();
});

test("ui root returns html", async () => {
  const server = await startWebhookServer({
    config: {
      nodeEnv: "test",
      port: 8100,
      botToken: "token",
      webhookUrl: "https://example.com/telegram/webhook",
      webhookSecret: "expected",
      dbUrl: "sqlite://./xseries.db",
      redisUrl: undefined,
      localBotApiBaseUrl: "https://api.telegram.org",
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
  });

  const res = await fetch("http://127.0.0.1:8100/");
  const body = await res.text();

  assert.equal(res.status, 200);
  assert.equal(body.includes("Gemini Chat Console"), true);
  await server.close();
});

test("chat api requires gemini key", async () => {
  const server = await startWebhookServer({
    config: {
      nodeEnv: "test",
      port: 8101,
      botToken: "token",
      webhookUrl: "https://example.com/telegram/webhook",
      webhookSecret: "expected",
      dbUrl: "sqlite://./xseries.db",
      redisUrl: undefined,
      localBotApiBaseUrl: "https://api.telegram.org",
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
  });

  const res = await fetch("http://127.0.0.1:8101/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "hello gemini" }),
  });
  const body = await res.json();

  assert.equal(res.status, 503);
  assert.equal(body.ok, false);
  await server.close();
});
