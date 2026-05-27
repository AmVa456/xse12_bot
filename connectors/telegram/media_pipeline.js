import downloadMedia from "./media_download.js";
import storeMedia from "./media_store.js";

/**
 * media_pipeline.js
 * -----------------
 * Full Telegram media processing pipeline.
 */

export default async function processMedia(event, token) {
  const media = event.content.media;

  // Telegram photos come as an array → use highest resolution
  const fileId = Array.isArray(media) ? media[media.length - 1].file_id : media.file_id;

  // Step 1: Download
  const downloaded = await downloadMedia(fileId, token);

  // Step 2: Store
  const stored = storeMedia(fileId, downloaded);

  // Step 3: Attach to event
  event.media_processed = stored;

  return event;
}
