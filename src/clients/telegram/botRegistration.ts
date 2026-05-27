import { TelegramClient } from "src/clients/telegram/telegramClient";
import { DEFAULT_BOT_COMMANDS } from "src/clients/telegram/defaultBotCommands";
import { BotCommand } from "src/clients/telegram/telegramTypes";

export const DEFAULT_WEBHOOK_UPDATES = [
  "message",
  "edited_message",
  "inline_query",
  "callback_query",
  "my_chat_member",
  "chat_member",
  "business_connection",
];

export type BotRegistrationInput = {
  webhookUrl: string;
  webhookSecret: string;
  commands?: BotCommand[];
};

export async function registerBotWebhookAndCommands(tg: TelegramClient, input: BotRegistrationInput): Promise<void> {
  await tg.setWebhook({
    url: input.webhookUrl,
    secret_token: input.webhookSecret,
    allowed_updates: DEFAULT_WEBHOOK_UPDATES,
  });
  await tg.setMyCommands({
    commands: input.commands && input.commands.length > 0 ? input.commands : DEFAULT_BOT_COMMANDS,
  });
}

