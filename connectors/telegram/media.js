import processMedia from "./media_pipeline.js";

export default async function mediaPipe(event, sender, token) {
  const { chat_id } = event;

  // Process + store media
  const processed = await processMedia(event, token);

  await sender.sendText(chat_id, "Media received and stored.");
  await sender.sendText(chat_id, `Saved as: ${processed.media_processed.local_path}`);
}
