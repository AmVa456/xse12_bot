import express from "express";
import webhook from "./webhook.js";
import router from "./router.js";
import Sender from "./sender.js";

/**
 * TelegramConnector
 * ------------------
 * Creates an Express sub‑app that handles Telegram webhook updates,
 * normalizes them, routes them into xSeries pipes, and exposes a sender
 * for outbound Telegram API calls.
 *
 * @param {Object} config
 * @param {string} config.token - Telegram bot token
 * @param {Object} config.pipes - xSeries pipe handlers (text, media, unknown)
 *
 * @returns Express.Router instance
 */
export default function TelegramConnector({ token, pipes }) {
  if (!token) throw new Error("TelegramConnector: Missing bot token");
  if (!pipes) throw new Error("TelegramConnector: Missing pipes object");

  const app = express();
  const sender = Sender(token);

  app.use(express.json());

  // Telegram webhook endpoint
  app.post(`/telegram/${token}`, async (req, res) => {
    try {
      const update = req.body;

      // Normalize + validate
      const event = await webhook(update);

      // Route to appropriate pipe
      await router(event, pipes, sender);

      res.sendStatus(200);
    } catch (err) {
      console.error("TelegramConnector Error:", err);
      res.sendStatus(500);
    }
  });

  return app;
}
