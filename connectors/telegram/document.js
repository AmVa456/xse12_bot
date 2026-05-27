/**
 * document.js
 * -----------
 * Handles file uploads (PDF, ZIP, DOCX, etc.)
 */

export default async function documentPipe(event, sender) {
  const { chat_id, content } = event;

  await sender.sendText(chat_id, "Got your document!");

  // You can store it in xTab, analyze it, etc.
}
