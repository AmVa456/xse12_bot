import { TelegramUpdate } from "src/clients/telegram/telegramTypes";

export type TgEventType =
  | "dm_message"
  | "group_message"
  | "inline_query"
  | "callback_query"
  | "system_event"
  | "unknown";

export type TgEvent = {
  eventId: string;
  updateId: number;
  type: TgEventType;
  chatId?: number;
  chatType?: string;
  userId?: number;
  text?: string;
  data?: string;
  inlineQueryId?: string;
  callbackQueryId?: string;
  timestamp: number;
  raw: TelegramUpdate;
};
