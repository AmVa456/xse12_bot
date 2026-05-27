import test from "node:test";
import assert from "node:assert/strict";
import { createDbClient } from "src/state/dbClient";
import { createLogger } from "src/utils/logger";
import { createTelegramClient } from "src/clients/telegram/telegramClient";
import { routeEvent } from "src/router/router";

const config = {
  nodeEnv: "test",
  port: 0,
  botToken: "token",
  webhookUrl: "https://example.com/telegram/webhook",
  webhookSecret: "secret",
  dbUrl: "sqlite://./xseries.db",
  redisUrl: undefined,
  localBotApiBaseUrl: "https://api.telegram.org",
  autoSetWebhook: false,
  telegramLoginBotUsername: "xse12_bot",
  telegramLoginAuthDomain: "example.com",
  telegramLoginCallbackUrl: "https://example.com/auth/telegram/callback",
  telegramLoginMaxAgeSeconds: 300,
  sessionSecret: "s",
  adminTelegramIds: [7],
  geminiModel: "gemini-1.5-flash",
};

test("router routes DM and emits outbound operation", async () => {
  const sent: unknown[] = [];
  const tg = createTelegramClient("token");
  tg.sendMessage = async (input) => {
    sent.push(input);
    return {
      message_id: 1,
      date: 1,
      chat: { id: input.chat_id, type: "private" },
      text: input.text,
    };
  };

  tg.answerCallbackQuery = async () => true;
  tg.answerInlineQuery = async () => true;
  tg.sendChatAction = async () => true;
  tg.editMessageText = async (input) => ({
    message_id: input.message_id,
    date: 1,
    chat: { id: input.chat_id, type: "private" },
    text: input.text,
  });
  tg.setWebhook = async () => true;

  const db = createDbClient(config.dbUrl);
  await routeEvent(
    {
      eventId: "evt_1",
      updateId: 1,
      type: "dm_message",
      chatId: 7,
      chatType: "private",
      userId: 7,
      text: "hello",
      timestamp: 1,
      raw: { update_id: 1 },
    },
    {
      config,
      db,
      logger: createLogger(),
      tg,
    }
  );

  assert.equal(sent.length > 0, true);
});
