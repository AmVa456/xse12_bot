import { createTelegramClient } from "../../../src/clients/telegram/telegramClient";
import type { TelegramUpdate } from "../../../src/clients/telegram/telegramTypes";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-telegram-bot-api-secret-token",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET() {
  return Response.json(
    {
      ok: true,
      service: "telegram-webhook",
      now: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: corsHeaders });
  }

  if (!isTelegramUpdate(body)) {
    return Response.json({ ok: false, error: "Invalid Telegram update" }, { status: 400, headers: corsHeaders });
  }

  try {
    await handleUpdate(body);
  } catch (error) {
    console.error("Webhook update handling failed:", error);
  }

  return Response.json({ ok: true }, { headers: corsHeaders });
}

function isAuthorized(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    return true;
  }

  const actual = request.headers.get("x-telegram-bot-api-secret-token");
  return actual === expected;
}

function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const maybeUpdate = value as Record<string, unknown>;
  return typeof maybeUpdate.update_id === "number";
}

async function handleUpdate(update: TelegramUpdate) {
  // TODO: Route this into src/normalization and src/router once those layers are implemented.
  const text = update.message?.text?.trim();
  const chatId = update.message?.chat?.id;

  if (text !== "/ping" || chatId === undefined) {
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is missing; skipping /ping reply.");
    return;
  }

  const telegram = createTelegramClient(token);
  await telegram.sendMessage({
    chat_id: chatId,
    text: "pong",
    reply_to_message_id: update.message?.message_id,
  });
}
