import normalize from "./normalizer.js";

/**
 * Webhook Receiver
 * ----------------
 * Accepts raw Telegram update objects and converts them into
 * normalized xSeries events using the normalizer module.
 *
 * @param {Object} update - Raw Telegram update payload
 * @returns {Object|null} Normalized event or null
 */
export default async function webhook(update) {
  if (!update) return null;

  try {
    const event = await normalize(update);
    return event;
  } catch (err) {
    console.error("Telegram Webhook Error:", err);
    return null;
  }
}
