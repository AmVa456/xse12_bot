/**
 * sticker.js
 * ----------
 * Handles stickers.
 */

export default async function stickerPipe(event, sender) {
  const { chat_id } = event;

  await sender.sendText(chat_id, "Cool sticker!");
}
