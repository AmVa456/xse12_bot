/**
 * voice.js
 * --------
 * Handles voice messages.
 */

export default async function voicePipe(event, sender) {
  const { chat_id } = event;

  await sender.sendText(chat_id, "I heard your voice message!");
}
