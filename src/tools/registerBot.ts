import { registerBotWebhookAndCommands } from "src/clients/telegram/botRegistration";
import { createTelegramClient } from "src/clients/telegram/telegramClient";
import { loadConfig } from "src/utils/config";
import { createLogger } from "src/utils/logger";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger();
  const tg = createTelegramClient(config.botToken, config.localBotApiBaseUrl);
  const me = await tg.getMe();

  await registerBotWebhookAndCommands(tg, {
    webhookUrl: config.webhookUrl,
    webhookSecret: config.webhookSecret,
  });

  logger.info("bot.registered.manual", {
    webhookUrl: config.webhookUrl,
    botId: me.id,
    botUsername: me.username,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown bot registration error";
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", message }));
  process.exit(1);
});

