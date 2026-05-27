/**
 * normalizer.js
 * --------------
 * Converts raw Telegram update objects into a unified xSeries event
 * format so all connectors behave consistently across platforms.
 */

export default async function normalize(update) {
  const msg =
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.edited_channel_post ||
    null;

  if (!msg) {
    return {
      platform: "telegram",
      type: "unknown",
      content: {},
      raw: update
    };
  }

  // Determine event type
  let type = "unknown";

  if (msg.text) type = "text";
  else if (msg.photo) type = "photo";
  else if (msg.document) type = "document";
  else if (msg.sticker) type = "sticker";
  else if (msg.voice) type = "voice";
  else if (msg.video) type = "video";

  return {
    platform: "telegram",
    type,
    chat_id: msg.chat?.id,
    user: {
      id: msg.from?.id,
      username: msg.from?.username,
      first_name: msg.from?.first_name,
      last_name: msg.from?.last_name
    },
    content: {
      text: msg.text || null,
      media: msg.photo || msg.document || msg.sticker || msg.voice || msg.video || null
    },
    raw: update
  };
}
