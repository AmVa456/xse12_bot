import { TelegramUpdate } from "src/clients/telegram/telegramTypes";
import { TgEvent } from "src/normalization/eventTypes";

export function normalizeUpdate(update: TelegramUpdate): TgEvent {
  const eventId = `evt_${update.update_id}`;

  if (update.message) {
    const isDm = update.message.chat.type === "private";
    return {
      eventId,
      updateId: update.update_id,
      type: isDm ? "dm_message" : "group_message",
      chatId: update.message.chat.id,
      chatType: update.message.chat.type,
      userId: update.message.from?.id,
      text: update.message.text,
      timestamp: update.message.date,
      raw: update,
    };
  }

  if (update.edited_message) {
    const isDm = update.edited_message.chat.type === "private";
    return {
      eventId,
      updateId: update.update_id,
      type: isDm ? "dm_message" : "group_message",
      chatId: update.edited_message.chat.id,
      chatType: update.edited_message.chat.type,
      userId: update.edited_message.from?.id,
      text: update.edited_message.text,
      timestamp: update.edited_message.date,
      raw: update,
    };
  }

  if (update.inline_query) {
    return {
      eventId,
      updateId: update.update_id,
      type: "inline_query",
      userId: update.inline_query.from.id,
      text: update.inline_query.query,
      inlineQueryId: update.inline_query.id,
      timestamp: Math.floor(Date.now() / 1000),
      raw: update,
    };
  }

  if (update.callback_query) {
    return {
      eventId,
      updateId: update.update_id,
      type: "callback_query",
      chatId: update.callback_query.message?.chat.id,
      chatType: update.callback_query.message?.chat.type,
      userId: update.callback_query.from.id,
      data: update.callback_query.data,
      callbackQueryId: update.callback_query.id,
      timestamp: update.callback_query.message?.date || Math.floor(Date.now() / 1000),
      raw: update,
    };
  }

  if (update.my_chat_member || update.chat_member || update.business_connection) {
    return {
      eventId,
      updateId: update.update_id,
      type: "system_event",
      timestamp: Math.floor(Date.now() / 1000),
      raw: update,
    };
  }

  return {
    eventId,
    updateId: update.update_id,
    type: "unknown",
    timestamp: Math.floor(Date.now() / 1000),
    raw: update,
  };
}
