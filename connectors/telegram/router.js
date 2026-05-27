/**
 * router.js
 * ----------
 * Routes normalized Telegram events into the correct xSeries pipes.
 *
 * Each pipe receives:
 *   - event  (normalized event object)
 *   - sender (Telegram outbound API wrapper)
 */

export default async function router(event, pipes, sender) {
  if (!event) return;

  try {
    // Text messages → text pipe
    if (event.type === "text" && pipes.text) {
      return await pipes.text(event, sender);
    }

    // Photos → media pipe
    if (event.type === "photo" && pipes.media) {
      return await pipes.media(event, sender);
    }

    // Documents → document pipe
    if (event.type === "document" && pipes.document) {
      return await pipes.document(event, sender);
    }

    // Stickers → sticker pipe
    if (event.type === "sticker" && pipes.sticker) {
      return await pipes.sticker(event, sender);
    }

    // Voice messages → voice pipe
    if (event.type === "voice" && pipes.voice) {
      return await pipes.voice(event, sender);
    }

    // Video → video pipe
    if (event.type === "video" && pipes.video) {
      return await pipes.video(event, sender);
    }

    // Fallback → unknown pipe
    if (pipes.unknown) {
      return await pipes.unknown(event, sender);
    }

  } catch (err) {
    console.error("Telegram Router Error:", err);
  }
}
