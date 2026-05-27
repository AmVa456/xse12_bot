/**
 * unknown.js
 * ----------
 * Fallback for any event type not explicitly handled.
 */

export default async function unknownPipe(event, sender) {
  const { chat_id } = event;

  await sender.sendText(chat_id, "I’m not sure how to handle that yet.");
}
