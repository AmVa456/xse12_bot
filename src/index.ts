import { createDbClient } from "src/state/dbClient";
import { createRedisClient } from "src/state/redisClient";
import { registerBotWebhookAndCommands } from "src/clients/telegram/botRegistration";
import { createTelegramClient } from "src/clients/telegram/telegramClient";
import { loadConfig } from "src/utils/config";
import { createLogger } from "src/utils/logger";
import { startWebhookServer } from "src/transport/webhookServer";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger();

  const db = createDbClient(config.dbUrl);
  const redis = await createRedisClient(config.redisUrl);
  const tg = createTelegramClient(config.botToken, config.localBotApiBaseUrl);

  if (config.autoSetWebhook) {
    const me = await tg.getMe();
    await registerBotWebhookAndCommands(tg, {
      webhookUrl: config.webhookUrl,
      webhookSecret: config.webhookSecret,
    });
    logger.info("bot.registered", {
      webhookUrl: config.webhookUrl,
      botUsername: me.username,
    });
  }

  await startWebhookServer({
    config,
    logger,
    db,
    redis,
    tg,
  });
}

bootstrap().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", message }));
  process.exit(1);
});
