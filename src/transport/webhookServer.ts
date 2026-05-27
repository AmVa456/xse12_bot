import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import os from "node:os";
import { URL } from "node:url";
import { createGeminiClient, GeminiTurn } from "src/clients/gemini/geminiClient";
import { processUpdate } from "src/router/router";
import { RouterDependencies } from "src/router/types";
import { CHAT_UI_CSS, CHAT_UI_HTML, CHAT_UI_JS } from "src/transport/chatUiAssets";

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data) as T);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function writeJson(res: ServerResponse, status: number, payload: unknown, headers?: Record<string, string>): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.end(body);
}

function writeText(
  res: ServerResponse,
  status: number,
  payload: string,
  contentType: string,
  headers?: Record<string, string>
): void {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      res.setHeader(key, value);
    }
  }
  res.end(payload);
}

type TelegramLoginPayload = {
  id?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string;
  hash?: string;
};

type ChatApiPayload = {
  message?: string;
  history?: Array<{
    role?: string;
    text?: string;
  }>;
};

function verifyTelegramLogin(payload: TelegramLoginPayload, botToken: string): boolean {
  const hash = payload.hash;
  if (!hash) {
    return false;
  }

  const entries = Object.entries(payload)
    .filter(([key, value]) => key !== "hash" && typeof value === "string" && value.length > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1));

  const dataCheckString = entries.map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const computed = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const computedBuffer = Buffer.from(computed, "hex");
  if (hashBuffer.length !== computedBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, computedBuffer);
}

function isFresh(authDate: string | undefined, maxAgeSeconds: number): boolean {
  if (!authDate) {
    return false;
  }

  const authUnix = Number.parseInt(authDate, 10);
  if (!Number.isFinite(authUnix)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return now - authUnix <= maxAgeSeconds;
}

export type WebhookServer = {
  server: Server;
  port: number;
  close(): Promise<void>;
};

async function listenOnPort(server: Server, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off("listening", onListening);
      reject(error);
    };

    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port);
  });
}

export async function startWebhookServer(deps: RouterDependencies): Promise<WebhookServer> {
  const fallbackPort = 8081;
  let activePort = deps.config.port;

  const server = createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        writeJson(res, 400, { ok: false, error: "Invalid request" });
        return;
      }

      const url = new URL(req.url, `http://localhost:${activePort}`);

      if (url.pathname === "/" && req.method === "GET") {
        writeText(res, 200, CHAT_UI_HTML, "text/html; charset=utf-8");
        return;
      }

      if (url.pathname === "/ui.css" && req.method === "GET") {
        writeText(res, 200, CHAT_UI_CSS, "text/css; charset=utf-8");
        return;
      }

      if (url.pathname === "/ui.js" && req.method === "GET") {
        writeText(res, 200, CHAT_UI_JS, "application/javascript; charset=utf-8");
        return;
      }

      if (url.pathname === "/health" && req.method === "GET") {
        writeJson(res, 200, {
          ok: true,
          status: "healthy",
          nodeEnv: deps.config.nodeEnv,
        });
        return;
      }

      if (url.pathname === "/auth/telegram/callback" && req.method === "GET") {
        const payload: TelegramLoginPayload = {
          id: url.searchParams.get("id") || undefined,
          first_name: url.searchParams.get("first_name") || undefined,
          last_name: url.searchParams.get("last_name") || undefined,
          username: url.searchParams.get("username") || undefined,
          photo_url: url.searchParams.get("photo_url") || undefined,
          auth_date: url.searchParams.get("auth_date") || undefined,
          hash: url.searchParams.get("hash") || undefined,
        };

        if (!verifyTelegramLogin(payload, deps.config.botToken) || !isFresh(payload.auth_date, deps.config.telegramLoginMaxAgeSeconds)) {
          writeJson(res, 401, { ok: false, error: "Invalid Telegram login payload" });
          return;
        }

        const telegramId = Number.parseInt(payload.id || "", 10);
        if (!Number.isFinite(telegramId)) {
          writeJson(res, 400, { ok: false, error: "Missing or invalid user id" });
          return;
        }

        const user = await deps.db.getOrCreateUserByTelegramId(telegramId, payload.username);
        const sessionToken = randomBytes(24).toString("hex");
        await deps.db.upsertSession({
          key: `login:${sessionToken}`,
          userId: user.id,
          data: { telegramId, username: payload.username || null },
          updatedAt: new Date().toISOString(),
        });

        writeJson(
          res,
          200,
          {
            ok: true,
            user: {
              id: user.id,
              telegramUserId: user.telegramUserId,
              username: user.username,
              roles: user.roles,
            },
          },
          {
            "Set-Cookie": `xser12_session=${sessionToken}; HttpOnly; Path=/; SameSite=Lax`,
          }
        );
        return;
      }

      if (url.pathname === "/api/chat" && req.method === "POST") {
        const payload = await readJsonBody<ChatApiPayload>(req);
        const message = payload.message?.trim();

        if (!message) {
          writeJson(res, 400, { ok: false, error: "Message is required." });
          return;
        }

        if (!deps.config.geminiApiKey) {
          writeJson(res, 503, { ok: false, error: "Gemini API key is not configured on the server." });
          return;
        }

        const history: GeminiTurn[] = (payload.history || [])
          .filter((turn) => typeof turn?.text === "string" && (turn.role === "user" || turn.role === "assistant"))
          .map((turn) => ({
            role: turn.role as "user" | "assistant",
            text: turn.text!.trim(),
          }))
          .filter((turn) => turn.text.length > 0)
          .slice(-20);

        try {
          const gemini = createGeminiClient(
            deps.config.geminiApiKey,
            deps.config.geminiModel,
            deps.config.geminiSystemPrompt
          );
          const reply = await gemini.generateReply(history, message);

          writeJson(res, 200, {
            ok: true,
            model: deps.config.geminiModel,
            reply,
          });
        } catch (error) {
          writeJson(res, 502, {
            ok: false,
            error: error instanceof Error ? error.message : "Gemini request failed.",
          });
        }
        return;
      }

      if (url.pathname === "/telegram/webhook" && req.method === "POST") {
        const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
        if (secretHeader !== deps.config.webhookSecret) {
          writeJson(res, 401, { ok: false, error: "Invalid webhook secret" });
          return;
        }

        const botToken = url.searchParams.get("token");
        const update = await readJsonBody<Parameters<typeof processUpdate>[0]>(req);
        writeJson(res, 200, { ok: true });

        processUpdate(update, deps, botToken || undefined).catch((error: unknown) => {
          deps.logger.error("webhook.process.error", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        });
        return;
      }

      writeJson(res, 404, { ok: false, error: "Route not found" });
    } catch (error) {
      deps.logger.error("webhook.unhandled", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      writeJson(res, 500, { ok: false, error: "Internal server error" });
    }
  });

  try {
    await listenOnPort(server, activePort);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "EADDRINUSE" || activePort === fallbackPort) {
      throw error;
    }

    deps.logger.warn("webhook.server.port_in_use", {
      requestedPort: activePort,
      fallbackPort,
    });

    activePort = fallbackPort;
    await listenOnPort(server, activePort);
  }

  deps.logger.info("webhook.server.started", {
    port: activePort,
    requestedPort: deps.config.port,
    fallbackUsed: activePort !== deps.config.port,
  });

  await deps.db.upsertNodeHeartbeat(`${os.hostname()}:${process.pid}`, "active");

  return {
    server,
    port: activePort,
    close() {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    },
  };
}

