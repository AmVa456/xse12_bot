import { config as loadDotEnv } from "dotenv";
import { ValidationError } from "src/utils/errors";

loadDotEnv();

export type AppConfig = {
  nodeEnv: string;
  port: number;
  botToken: string;
  webhookUrl: string;
  webhookSecret: string;
  dbUrl: string;
  redisUrl?: string;
  localBotApiBaseUrl: string;
  autoSetWebhook: boolean;
  telegramLoginBotUsername: string;
  telegramLoginAuthDomain: string;
  telegramLoginCallbackUrl: string;
  telegramLoginMaxAgeSeconds: number;
  sessionSecret: string;
  adminTelegramIds: number[];
  authorizedMasterId?: number;
  geminiApiKey?: string;
  geminiModel: string;
  geminiSystemPrompt?: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ValidationError(`Missing required env var: ${name}`);
  }

  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function toInt(value: string, field: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`Invalid integer for ${field}: ${value}`);
  }

  return parsed;
}

export function loadConfig(): AppConfig {
  const adminTelegramIds = (process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => toInt(item, "ADMIN_TELEGRAM_IDS"));

  return {
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
    port: toInt(process.env.PORT?.trim() || "3680", "PORT"),
    botToken: required("BOT_TOKEN"),
    webhookUrl: required("WEBHOOK_URL"),
    webhookSecret: required("WEBHOOK_SECRET"),
    dbUrl: process.env.DB_URL?.trim() || "sqlite://./xseries.db",
    redisUrl: optional("REDIS_URL"),
    localBotApiBaseUrl: process.env.LOCAL_BOT_API_BASE_URL?.trim() || "http://127.0.0.1:8081",
    autoSetWebhook: (process.env.AUTO_SET_WEBHOOK?.trim() || "true") !== "false",
    telegramLoginBotUsername: required("TELEGRAM_LOGIN_BOT_USERNAME"),
    telegramLoginAuthDomain: required("TELEGRAM_LOGIN_AUTH_DOMAIN"),
    telegramLoginCallbackUrl: required("TELEGRAM_LOGIN_CALLBACK_URL"),
    telegramLoginMaxAgeSeconds: toInt(
      process.env.TELEGRAM_LOGIN_MAX_AGE_SECONDS?.trim() || "300",
      "TELEGRAM_LOGIN_MAX_AGE_SECONDS"
    ),
    sessionSecret: required("SESSION_SECRET"),
    adminTelegramIds,
    authorizedMasterId: process.env.AUTHORIZED_MASTER_ID ? toInt(process.env.AUTHORIZED_MASTER_ID, "AUTHORIZED_MASTER_ID") : undefined,
    geminiApiKey: optional("GEMINI_API_KEY"),
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash",
    geminiSystemPrompt: optional("GEMINI_SYSTEM_PROMPT"),
  };
}
