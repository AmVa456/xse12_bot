/**
 * video.js
 * --------
 * Handles video messages.
 */

export default async function videoPipe(event, sender) {
  const { chat_id } = event;

  await sender.sendText(chat_id, "Nice video!");
}
