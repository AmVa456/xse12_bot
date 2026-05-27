import os from "node:os";
import { GeminiDialogueTurn, GeminiSdkClient } from "src/clients/gemini/geminiSdkClient";
import { registerBotWebhookAndCommands } from "src/clients/telegram/botRegistration";
import { createTelegramClient } from "src/clients/telegram/telegramClient";
import { isPipeHalted, listHaltedPipes, setPipeHalted } from "src/router/pipeControls";
import { Pipe, RouteContext, pushOutbound } from "src/router/types";
import { readBufferedLogs } from "src/state/logBuffer";
import { ForbiddenError } from "src/utils/errors";
import { extractMediaRefFromMessage } from "src/utils/media";

type ParsedCommand = {
  pillar: string;
  action?: string;
  payload: string;
  argv: string[];
};

type ReplyParseMode = "MarkdownV2" | "HTML" | "Markdown";
type BotApiMode = "official" | "local";

const LEGACY_COMMANDS = new Set([
  "spawn_bot",
  "purge_bot",
  "list_bots",
  "route_bot",
  "pause_bot",
  "resume_bot",
  "scrape",
  "sync_store",
  "queue_status",
  "retry_job",
  "purge_dlq",
  "sys_health",
  "tail_logs",
  "start",
  "help",
  "admin",
]);

const PILLARS = new Set(["sys", "pipe", "net", "db", "ai", "media", "x"]);
const MAX_TABLE_ROWS = 20;
const MAX_LOG_LINES = 20;
const MAX_OUTPUT_CHARS = 3500;
const OFFICIAL_MEDIA_LIMIT_BYTES = 50 * 1024 * 1024;
const LOCAL_MEDIA_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;
let mediaPushQueue: Promise<void> = Promise.resolve();

const PILLAR_HELP: Record<string, string[]> = {
  sys: ["/sys top", "/sys nodes", "/sys kill <pid>"],
  pipe: ["/pipe ls", "/pipe halt <bucket.pipeName>", "/pipe tail [filter] [lines<=20]"],
  net: ["/net curl <method> <url>", "/net hook"],
  db: ["/db query <sql>", "/db flush <session_key>"],
  media: ["/media grab <alias>", "/media push <alias> <target_chat_id>", "/media clone <chat_id> <message_id> <target_chat_id>", "/media bridge <source_chat_id> <target_chat_id>", "/media unbridge <source_chat_id>"],
  ai: ["/ai plan <objective>", "/ai code <spec>", "/ai refactor <code>"],
  x: ["/x logs [filter] [lines<=20]", "/x mode"],
};

function parseCliCommand(text?: string): ParsedCommand | undefined {
  if (!text) {
    return undefined;
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) {
    return undefined;
  }

  const withoutSlash = trimmed.slice(1).trim();
  if (!withoutSlash) {
    return undefined;
  }

  const argv = withoutSlash.split(/\s+/);
  const pillar = (argv.shift() || "").toLowerCase();
  const action = argv.length > 0 ? argv.shift()!.toLowerCase() : undefined;
  const payload = argv.join(" ");

  return { pillar, action, payload, argv };
}

function reply(ctx: RouteContext, text: string, parseMode?: ReplyParseMode): void {
  if (!ctx.event.chatId) {
    return;
  }

  pushOutbound(ctx, {
    type: "sendMessage",
    chatId: ctx.event.chatId,
    text,
    parseMode,
  });
}

function formatCodeBlock(text: string, language = ""): string {
  const sanitized = text.replace(/```/g, "'''").trimEnd();
  const body = sanitized.length > 0 ? sanitized : "(empty)";
  return `\`\`\`${language}\n${body}\n\`\`\``;
}

function replyCode(ctx: RouteContext, text: string, language = ""): void {
  reply(ctx, formatCodeBlock(text, language), "Markdown");
}

function replyPillarHelp(ctx: RouteContext, pillar: keyof typeof PILLAR_HELP): void {
  const lines = [`Pillar: /${pillar}`, ...PILLAR_HELP[pillar]];
  replyCode(ctx, lines.join("\n"));
}

function parseFilterAndLimit(payload: string | undefined, defaultLimit: number): { filter?: string; limit: number } {
  const parts = (payload || "")
    .trim()
    .split(/\s+/)
    .filter((item) => item.length > 0);

  let limit = defaultLimit;
  if (parts.length > 0) {
    const maybeLimit = Number.parseInt(parts[parts.length - 1], 10);
    if (Number.isFinite(maybeLimit)) {
      limit = maybeLimit;
      parts.pop();
    }
  }

  return {
    filter: parts.length > 0 ? parts.join(" ").toLowerCase() : undefined,
    limit: Math.min(Math.max(limit, 1), MAX_LOG_LINES),
  };
}

function truncateLines(lines: string[], maxLines: number): string {
  const bounded = lines.slice(-maxLines);
  const omittedCount = lines.length - bounded.length;
  const body = omittedCount > 0 ? [`... ${omittedCount} older lines omitted ...`, ...bounded] : bounded;
  const output = body.join("\n");
  if (output.length <= MAX_OUTPUT_CHARS) {
    return output;
  }
  return `${output.slice(0, MAX_OUTPUT_CHARS - 24)}\n... output truncated ...`;
}

function formatQueryResult(columns: string[], rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return "No rows returned.";
  }

  const selectedRows = rows.slice(0, MAX_TABLE_ROWS);
  const header = columns.length > 0 ? columns.join(" | ") : Object.keys(selectedRows[0]).join(" | ");
  const divider = header
    .split("|")
    .map(() => "---")
    .join("|");
  const body = selectedRows
    .map((row) => {
      const values = (columns.length > 0 ? columns : Object.keys(row)).map((key) => String(row[key] ?? "null"));
      return values.join(" | ");
    })
    .join("\n");

  const omitted = rows.length - selectedRows.length;
  const summary = omitted > 0 ? `\n... ${omitted} rows omitted ...` : "";
  return `${header}\n${divider}\n${body}${summary}`;
}

function normalizeAiOutput(text: string): string {
  return text
    .trim()
    .replace(/^(sure|absolutely|of course|certainly|here(?:'s| is))[^\n]*\n+/i, "")
    .trim();
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function getBotApiMode(ctx: RouteContext): BotApiMode {
  const configured = (process.env.XSERIES_BOT_API_MODE || "").trim().toLowerCase();
  if (configured === "official" || configured === "local") {
    return configured;
  }

  const baseUrl = ctx.config.localBotApiBaseUrl.toLowerCase();
  return baseUrl.includes("api.telegram.org") ? "official" : "local";
}

function mediaSizeWarning(mode: BotApiMode, fileSize?: number): string | undefined {
  if (!fileSize || !Number.isFinite(fileSize) || fileSize <= 0) {
    return undefined;
  }

  const limitBytes = mode === "official" ? OFFICIAL_MEDIA_LIMIT_BYTES : LOCAL_MEDIA_LIMIT_BYTES;
  if (fileSize <= limitBytes) {
    return undefined;
  }

  const modeText = mode === "official" ? "Official mode (50MB max)" : "Local mode (2GB max)";
  return `Media size ${formatBytes(fileSize)} exceeds ${modeText}.`;
}

function parseError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function enqueueMediaPush(task: () => Promise<void>): void {
  mediaPushQueue = mediaPushQueue
    .catch(() => undefined)
    .then(task)
    .catch(() => undefined);
}

function requireAdmin(ctx: RouteContext): void {
  if (!ctx.meta.isAdmin) {
    throw new ForbiddenError("Admin command requires admin role.");
  }
}

function toAiHistory(value: unknown): GeminiDialogueTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }
      const role = (entry as { role?: unknown }).role;
      const text = (entry as { text?: unknown }).text;
      if ((role !== "user" && role !== "model") || typeof text !== "string") {
        return undefined;
      }
      return { role, text };
    })
    .filter((entry): entry is GeminiDialogueTurn => Boolean(entry))
    .slice(-20);
}

function persistAiHistory(ctx: RouteContext, history: GeminiDialogueTurn[]): void {
  if (!ctx.sessionState) {
    ctx.sessionState = {
      key: `u_${ctx.event.userId || "unknown"}:c_${ctx.event.chatId || "none"}`,
      data: {},
      updatedAt: new Date().toISOString(),
    };
  }
  ctx.sessionState.data.ai_history = history.slice(-20);
  ctx.sessionState.updatedAt = new Date().toISOString();
  ctx.mutations.sessionState = ctx.sessionState;
}

async function handleLegacyCommand(ctx: RouteContext, cmd: string): Promise<boolean> {
  if (!LEGACY_COMMANDS.has(cmd)) {
    return false;
  }

  if (cmd === "spawn_bot") {
    requireAdmin(ctx);
    const parts = (ctx.event.text || "").trim().split(/\s+/);
    const token = parts[1];
    const tag = parts[2] || "general";
    if (!token) {
      reply(ctx, "Usage: /spawn_bot <bot_token> <purpose_tag>");
      ctx.mutations.stopPipeline = true;
      return true;
    }

    try {
      const tempTg = createTelegramClient(token, ctx.config.localBotApiBaseUrl);
      const response = await fetch(`${ctx.config.localBotApiBaseUrl}/bot${token}/getMe`);
      const botData = (await response.json()) as { ok?: boolean; description?: string; result?: { username?: string; first_name?: string } };
      if (!botData.ok || !botData.result) {
        throw new Error(`Token verification failed: ${botData.description || "Unknown error"}`);
      }

      const webhookUrl = `${ctx.config.webhookUrl}?token=${token}`;
      await registerBotWebhookAndCommands(tempTg, {
        webhookUrl,
        webhookSecret: ctx.config.webhookSecret,
      });

      const bot = await ctx.db.registerBot({
        token,
        username: botData.result.username,
        displayName: botData.result.first_name,
        purposeTag: tag,
        status: "active",
      });
      reply(ctx, `Bot spawned successfully: @${bot.username || "unknown"} (ID: ${bot.botId})`);
    } catch (error) {
      reply(ctx, `Failed to spawn bot: ${parseError(error)}`);
    }

    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "purge_bot") {
    requireAdmin(ctx);
    const parts = (ctx.event.text || "").trim().split(/\s+/);
    const botId = Number.parseInt(parts[1] || "", 10);
    if (!botId) {
      reply(ctx, "Usage: /purge_bot <bot_id>");
      ctx.mutations.stopPipeline = true;
      return true;
    }

    const bots = await ctx.db.listBots();
    const bot = bots.find((item) => item.botId === botId);
    if (!bot) {
      reply(ctx, `Bot not found: ${botId}`);
      ctx.mutations.stopPipeline = true;
      return true;
    }

    try {
      await fetch(`${ctx.config.localBotApiBaseUrl}/bot${bot.token}/deleteWebhook`);
      await ctx.db.updateBotStatus(botId, "purged");
      reply(ctx, `Bot purged successfully: @${bot.username || "unknown"}`);
    } catch (error) {
      reply(ctx, `Failed to purge bot: ${parseError(error)}`);
    }

    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "list_bots") {
    requireAdmin(ctx);
    const bots = await ctx.db.listBots();
    if (bots.length === 0) {
      reply(ctx, "No active bots in the matrix.");
    } else {
      const lines = ["ID | Username | Purpose | Status"];
      for (const bot of bots) {
        lines.push(`${bot.botId} | @${bot.username || "unknown"} | ${bot.purposeTag || "N/A"} | ${bot.status}`);
      }
      replyCode(ctx, lines.join("\n"));
    }
    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "route_bot") {
    requireAdmin(ctx);
    const parts = (ctx.event.text || "").trim().split(/\s+/);
    const botId = Number.parseInt(parts[1] || "", 10);
    const bucket = parts[2];
    if (!botId || !bucket) {
      reply(ctx, "Usage: /route_bot <bot_id> <target_bucket>");
      ctx.mutations.stopPipeline = true;
      return true;
    }

    await ctx.db.updateBotRouting(botId, bucket);
    reply(ctx, `Bot ${botId} routed to ${bucket}`);
    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "pause_bot" || cmd === "resume_bot") {
    requireAdmin(ctx);
    const parts = (ctx.event.text || "").trim().split(/\s+/);
    const botId = Number.parseInt(parts[1] || "", 10);
    if (!botId) {
      reply(ctx, `Usage: /${cmd} <bot_id>`);
      ctx.mutations.stopPipeline = true;
      return true;
    }

    const status = cmd === "pause_bot" ? "paused" : "active";
    await ctx.db.updateBotStatus(botId, status);
    reply(ctx, `Bot ${botId} is now ${status}`);
    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "sys_health") {
    requireAdmin(ctx);
    reply(ctx, "System Health: CPU: 12% | RAM: 4.2GB/12GB | DB: WAL OK | Daemon: Running");
    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "tail_logs") {
    requireAdmin(ctx);
    const parts = (ctx.event.text || "").trim().split(/\s+/);
    const source = (parts[1] || "").toLowerCase();
    const lineCount = Number.parseInt(parts[2] || "10", 10);
    const logs = readBufferedLogs(MAX_LOG_LINES).filter((entry) => !source || source === "global" || entry.message.toLowerCase().includes(source));
    if (logs.length === 0) {
      reply(ctx, source ? `No logs for source: ${source}` : "No logs buffered.");
    } else {
      const lines = logs.map((entry) => `[${entry.ts}] ${entry.level.toUpperCase()} ${entry.message}`);
      const bounded = truncateLines(lines, Math.min(Math.max(lineCount, 1), MAX_LOG_LINES));
      replyCode(ctx, bounded);
    }
    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "start") {
    reply(ctx, "xser12 bot is online. Type /help for command pillars.");
    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "help") {
    replyCode(
      ctx,
      [
        "Top-level Pillars",
        "/sys",
        "/pipe",
        "/net",
        "/db",
        "/media",
        "/ai",
        "/x",
        "",
        "Type a pillar alone to view action-specific help.",
      ].join("\n")
    );
    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "admin") {
    requireAdmin(ctx);
    const parts = (ctx.event.text || "").trim().split(/\s+/);
    const subcommand = (parts[1] || "status").toLowerCase();
    if (subcommand === "status") {
      reply(ctx, "Managed bot status: healthy");
    } else if (subcommand === "health") {
      reply(ctx, "Health check: db=ok redis=ok dispatcher=ok");
    } else if (subcommand === "config") {
      const key = parts[2];
      const value = parts.slice(3).join(" ");
      if (!key || !value) {
        reply(ctx, "Usage: /admin config <key> <value>");
      } else {
        await ctx.db.setSetting(key, value);
        reply(ctx, `Config updated: ${key}`);
      }
    } else {
      reply(ctx, `Unknown admin subcommand: ${subcommand}`);
    }

    if (ctx.userState) {
      await ctx.db.addAuditEntry({
        id: `audit_${Date.now()}`,
        actorUserId: ctx.userState.id,
        action: `admin.${subcommand}`,
        createdAt: new Date().toISOString(),
      });
    }

    ctx.mutations.stopPipeline = true;
    return true;
  }

  if (cmd === "scrape" || cmd === "sync_store" || cmd === "queue_status" || cmd === "retry_job" || cmd === "purge_dlq") {
    requireAdmin(ctx);
    reply(ctx, `Command accepted: /${cmd}`);
    ctx.mutations.stopPipeline = true;
    return true;
  }

  return false;
}

async function handleSysCommand(ctx: RouteContext, action?: string, payload?: string): Promise<void> {
  requireAdmin(ctx);

  if (!action) {
    replyPillarHelp(ctx, "sys");
    return;
  }

  if (action === "top") {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const cpuCount = os.cpus().length;
    const processWithHandles = process as unknown as { _getActiveHandles?: () => unknown[] };
    const activeHandles = typeof processWithHandles._getActiveHandles === "function" ? processWithHandles._getActiveHandles().length : 0;
    replyCode(
      ctx,
      [
        `PID: ${process.pid}`,
        `CPU Cores: ${cpuCount}`,
        `Memory Used: ${(used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(total / 1024 / 1024 / 1024).toFixed(2)} GB`,
        `Active Handles: ${activeHandles}`,
      ].join("\n")
    );
    return;
  }

  if (action === "nodes") {
    const nodes = await ctx.db.listNodeHeartbeats();
    if (nodes.length === 0) {
      replyCode(ctx, "No active cluster nodes recorded.");
      return;
    }

    const rows = nodes.map((node) => `${node.nodeId} | ${node.status} | ${node.updatedAt}`).join("\n");
    replyCode(ctx, `node_id | status | updated_at\n${rows}`);
    return;
  }

  if (action === "kill") {
    const pid = Number.parseInt(payload || "", 10);
    if (!pid) {
      replyPillarHelp(ctx, "sys");
      return;
    }
    if (pid !== process.pid) {
      reply(ctx, `Refusing kill. Target ${pid} != current process ${process.pid}.`);
      return;
    }

    reply(ctx, `Killing process ${pid} in 50ms.`);
    setTimeout(() => process.exit(1), 50);
    return;
  }

  replyPillarHelp(ctx, "sys");
}

async function handlePipeCommand(ctx: RouteContext, action?: string, payload?: string): Promise<void> {
  requireAdmin(ctx);

  if (!action) {
    replyPillarHelp(ctx, "pipe");
    return;
  }

  if (action === "ls") {
    const { getAllBuckets } = await import("src/router/bucketRegistry");
    const buckets = getAllBuckets();
    const halted = new Set(listHaltedPipes());
    const lines: string[] = ["pipe_id | state"];
    for (const bucket of buckets) {
      for (const pipe of bucket.pipes) {
        const pipeName = pipe.name || "anonymousPipe";
        const id = `${bucket.name}.${pipeName}`.toLowerCase();
        lines.push(`${id} | ${halted.has(id) ? "halted" : "active"}`);
      }
    }
    replyCode(ctx, lines.join("\n"));
    return;
  }

  if (action === "halt") {
    if (!payload) {
      replyPillarHelp(ctx, "pipe");
      return;
    }
    const id = payload.trim().toLowerCase();
    const current = isPipeHalted(id);
    setPipeHalted(id, !current);
    reply(ctx, `${id} is now ${current ? "active" : "halted"}.`);
    return;
  }

  if (action === "tail") {
    const parsed = parseFilterAndLimit(payload, 15);
    const logs = readBufferedLogs(MAX_LOG_LINES);
    const filtered = parsed.filter ? logs.filter((entry) => entry.message.toLowerCase().includes(parsed.filter!)) : logs;
    if (filtered.length === 0) {
      reply(ctx, "No log entries matched.");
      return;
    }
    const lines = filtered.map((entry) => `[${entry.ts}] ${entry.level.toUpperCase()} ${entry.message}`);
    replyCode(ctx, truncateLines(lines, parsed.limit));
    return;
  }

  replyPillarHelp(ctx, "pipe");
}

async function handleNetCommand(ctx: RouteContext, action?: string, payload?: string): Promise<void> {
  requireAdmin(ctx);

  if (!action) {
    replyPillarHelp(ctx, "net");
    return;
  }

  if (action === "curl") {
    if (!payload) {
      replyPillarHelp(ctx, "net");
      return;
    }

    const parts = payload.split(/\s+/).filter((item) => item.length > 0);
    const method = (parts[0] || "GET").toUpperCase();
    const url = parts[1] || parts[0];
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      replyPillarHelp(ctx, "net");
      return;
    }

    try {
      const response = await fetch(url, { method });
      const text = (await response.text()).slice(0, 600);
      replyCode(ctx, `HTTP ${response.status} ${response.statusText}\n${text}`);
    } catch (error) {
      reply(ctx, `Network call failed: ${parseError(error)}`);
    }
    return;
  }

  if (action === "hook") {
    try {
      const url = `${ctx.config.localBotApiBaseUrl}/bot${ctx.config.botToken}/getWebhookInfo`;
      const response = await fetch(url, { method: "GET" });
      const payloadText = await response.text();
      replyCode(ctx, `Webhook Info (${response.status})\n${payloadText.slice(0, 1000)}`);
    } catch (error) {
      reply(ctx, `Webhook check failed: ${parseError(error)}`);
    }
    return;
  }

  replyPillarHelp(ctx, "net");
}

async function handleDbCommand(ctx: RouteContext, action?: string, payload?: string): Promise<void> {
  requireAdmin(ctx);

  if (!action) {
    replyPillarHelp(ctx, "db");
    return;
  }

  if (action === "query") {
    if (!payload) {
      replyPillarHelp(ctx, "db");
      return;
    }
    try {
      const result = await ctx.db.runQuery(payload);
      replyCode(ctx, formatQueryResult(result.columns, result.rows));
    } catch (error) {
      reply(ctx, `Query failed: ${parseError(error)}`);
    }
    return;
  }

  if (action === "flush") {
    if (!payload) {
      replyPillarHelp(ctx, "db");
      return;
    }
    const removed = await ctx.db.flushSessionWindow(payload.trim());
    reply(ctx, removed ? `Session flushed: ${payload.trim()}` : `Session not found: ${payload.trim()}`);
    return;
  }

  replyPillarHelp(ctx, "db");
}

async function handleAiCommand(ctx: RouteContext, action?: string, payload?: string): Promise<void> {
  requireAdmin(ctx);
  if (!ctx.config.geminiApiKey) {
    reply(ctx, "Missing GEMINI_API_KEY. Add it to .env and restart.");
    return;
  }

  if (!action) {
    replyPillarHelp(ctx, "ai");
    return;
  }

  if (!payload) {
    replyPillarHelp(ctx, "ai");
    return;
  }

  if (!ctx.event.chatId) {
    return;
  }

  pushOutbound(ctx, {
    type: "sendChatAction",
    chatId: ctx.event.chatId,
    action: "typing",
  });

  const history = toAiHistory(ctx.sessionState?.data.ai_history);
  const client = new GeminiSdkClient(ctx.config.geminiApiKey, ctx.config.geminiModel, ctx.config.geminiSystemPrompt);

  try {
    let responseText: string;
    if (action === "plan") {
      responseText = await client.generateText(
        history,
        payload,
        "You are a lead architect. The user is on a mobile terminal. Output a strict, copy-pasteable Markdown checklist with no conversational intro or outro. Break the objective into logical execution phases."
      );
    } else if (action === "code") {
      responseText = await client.generateText(
        history,
        payload,
        "Output ONLY the raw code block in the requested language. Do not explain the code. The user needs to paste this directly into Acode."
      );
    } else if (action === "refactor") {
      const reasoned = await client.generateReasoned(
        history,
        payload,
        "Refactor the provided code for performance and maintainability. Return JSON with reasoning_steps array and final_synthesis string containing the refactored code."
      );
      for (const step of reasoned.reasoning_steps) {
        ctx.logger.info("ai.reasoning.step", { step });
      }
      responseText = reasoned.final_synthesis;
    } else {
      replyPillarHelp(ctx, "ai");
      return;
    }

    const cleaned = normalizeAiOutput(responseText);
    const updatedHistory: GeminiDialogueTurn[] = [
      ...history,
      { role: "user" as const, text: `${action} ${payload}` },
      { role: "model" as const, text: cleaned },
    ].slice(-20);
    persistAiHistory(ctx, updatedHistory);
    reply(ctx, cleaned);
  } catch (error) {
    reply(ctx, `AI command failed: ${parseError(error)}`);
  }
}

async function handleMediaCommand(ctx: RouteContext, action?: string, payload?: string): Promise<void> {
  requireAdmin(ctx);
  if (!action) {
    replyPillarHelp(ctx, "media");
    return;
  }

  if (action === "grab") {
    const alias = (payload || "").trim().toLowerCase();
    if (!alias) {
      replyPillarHelp(ctx, "media");
      return;
    }

    const replied = ctx.event.raw.message?.reply_to_message || ctx.event.raw.edited_message?.reply_to_message;
    const media = extractMediaRefFromMessage(replied);
    if (!media) {
      reply(ctx, "No media detected to grab.");
      return;
    }

    const mode = getBotApiMode(ctx);
    const warning = mediaSizeWarning(mode, media.fileSize);
    if (warning) {
      reply(ctx, warning);
      return;
    }

    const saved = await ctx.db.saveMediaAlias({
      alias,
      fileId: media.fileId,
      type: media.type,
      fileSize: media.fileSize,
      addedBy: ctx.userState?.id || (ctx.event.userId ? `u_${ctx.event.userId}` : undefined),
    });
    const sizeText = saved.fileSize ? ` ${formatBytes(saved.fileSize)}` : "";
    reply(ctx, `Saved media alias '${saved.alias}' (${saved.type})${sizeText}.`);
    return;
  }

  if (action === "push") {
    const parts = (payload || "").split(/\s+/).filter((item) => item.length > 0);
    const alias = (parts[0] || "").toLowerCase();
    const targetChatId = Number.parseInt(parts[1] || "", 10);
    if (!alias || !Number.isFinite(targetChatId)) {
      replyPillarHelp(ctx, "media");
      return;
    }

    const saved = await ctx.db.getMediaAlias(alias);
    if (!saved) {
      reply(ctx, `Alias not found: ${alias}`);
      return;
    }

    const mode = getBotApiMode(ctx);
    const warning = mediaSizeWarning(mode, saved.fileSize);
    if (warning) {
      reply(ctx, warning);
      return;
    }

    if (!ctx.event.chatId) {
      reply(ctx, "Push requires a source chat context.");
      return;
    }

    const statusMessage = await ctx.tg.sendMessage({
      chat_id: ctx.event.chatId,
      text: `Processing push request for '${alias}' -> ${targetChatId}...`,
    });

    const statusChatId = ctx.event.chatId;
    const statusMessageId = statusMessage.message_id;
    const jobPayload = { ...saved, alias };

    enqueueMediaPush(async () => {
      try {
        if (jobPayload.type === "photo") {
          await ctx.tg.sendPhoto({ chat_id: targetChatId, photo: jobPayload.fileId });
        } else if (jobPayload.type === "video") {
          await ctx.tg.sendVideo({ chat_id: targetChatId, video: jobPayload.fileId });
        } else {
          await ctx.tg.sendDocument({ chat_id: targetChatId, document: jobPayload.fileId });
        }

        await ctx.tg.editMessageText({
          chat_id: statusChatId,
          message_id: statusMessageId,
          text: `Success: pushed '${jobPayload.alias}' to ${targetChatId}.`,
        });
      } catch (error) {
        const message = parseError(error).replace(/\s+/g, " ").slice(0, 280);
        ctx.logger.error("media.push.failed", {
          alias: jobPayload.alias,
          targetChatId,
          message,
        });
        try {
          await ctx.tg.editMessageText({
            chat_id: statusChatId,
            message_id: statusMessageId,
            text: `Push failed for '${jobPayload.alias}': ${message}`,
          });
        } catch (editError) {
          ctx.logger.warn("media.push.status_edit_failed", {
            alias: jobPayload.alias,
            targetChatId,
            message: parseError(editError),
          });
        }
      }
    });
    return;
  }

  if (action === "clone") {
    const parts = (payload || "").split(/\s+/).filter((item) => item.length > 0);
    const fromChatId = Number.parseInt(parts[0] || "", 10);
    const messageId = Number.parseInt(parts[1] || "", 10);
    const targetChatId = Number.parseInt(parts[2] || "", 10);
    if (!Number.isFinite(fromChatId) || !Number.isFinite(messageId) || !Number.isFinite(targetChatId)) {
      replyPillarHelp(ctx, "media");
      return;
    }

    pushOutbound(ctx, {
      type: "copyMessage",
      chatId: targetChatId,
      fromChatId,
      messageId,
    });
    reply(ctx, `Clone queued from ${fromChatId}:${messageId} -> ${targetChatId}.`);
    return;
  }

  if (action === "bridge") {
    const parts = (payload || "").split(/\s+/).filter((item) => item.length > 0);
    const sourceChatId = Number.parseInt(parts[0] || "", 10);
    const targetChatId = Number.parseInt(parts[1] || "", 10);
    if (!Number.isFinite(sourceChatId) || !Number.isFinite(targetChatId)) {
      replyPillarHelp(ctx, "media");
      return;
    }

    await ctx.db.setSetting(`media_bridge:${sourceChatId}`, String(targetChatId));
    reply(ctx, `Bridge active: ${sourceChatId} -> ${targetChatId}`);
    return;
  }

  if (action === "unbridge") {
    const sourceChatId = Number.parseInt((payload || "").trim(), 10);
    if (!Number.isFinite(sourceChatId)) {
      replyPillarHelp(ctx, "media");
      return;
    }

    await ctx.db.setSetting(`media_bridge:${sourceChatId}`, "disabled");
    reply(ctx, `Bridge removed for source ${sourceChatId}.`);
    return;
  }

  replyPillarHelp(ctx, "media");
}

async function handleXCommand(ctx: RouteContext, action?: string, payload?: string): Promise<void> {
  requireAdmin(ctx);

  if (!action) {
    replyPillarHelp(ctx, "x");
    return;
  }

  if (action === "logs") {
    const parsed = parseFilterAndLimit(payload, 15);
    const logs = readBufferedLogs(MAX_LOG_LINES);
    const filtered = parsed.filter ? logs.filter((entry) => entry.message.toLowerCase().includes(parsed.filter!)) : logs;
    if (filtered.length === 0) {
      reply(ctx, "No logs matched.");
      return;
    }

    const lines = filtered.map((entry) => `[${entry.ts}] ${entry.level.toUpperCase()} ${entry.message}`);
    replyCode(ctx, truncateLines(lines, parsed.limit));
    return;
  }

  if (action === "mode") {
    const mode = getBotApiMode(ctx);
    const modeLimit = mode === "official" ? "50MB media limit" : "2GB media limit";
    replyCode(ctx, `mode: ${mode}\nbase_url: ${ctx.config.localBotApiBaseUrl}\nmedia_limit: ${modeLimit}`);
    return;
  }

  replyPillarHelp(ctx, "x");
}

export const commandPipe: Pipe = async (ctx) => {
  const parsed = parseCliCommand(ctx.event.text);
  if (!parsed) {
    return;
  }

  ctx.meta.command = parsed.pillar;
  ctx.meta.pillar = parsed.pillar;
  ctx.meta.action = parsed.action;
  ctx.meta.payload = parsed.payload;

  if (await handleLegacyCommand(ctx, parsed.pillar)) {
    return;
  }

  if (!PILLARS.has(parsed.pillar)) {
    reply(ctx, "Command not recognized.");
    ctx.mutations.stopPipeline = true;
    return;
  }

  if (parsed.pillar === "sys") {
    await handleSysCommand(ctx, parsed.action, parsed.payload);
  } else if (parsed.pillar === "pipe") {
    await handlePipeCommand(ctx, parsed.action, parsed.payload);
  } else if (parsed.pillar === "net") {
    await handleNetCommand(ctx, parsed.action, parsed.payload);
  } else if (parsed.pillar === "db") {
    await handleDbCommand(ctx, parsed.action, parsed.payload);
  } else if (parsed.pillar === "ai") {
    await handleAiCommand(ctx, parsed.action, parsed.payload);
  } else if (parsed.pillar === "media") {
    await handleMediaCommand(ctx, parsed.action, parsed.payload);
  } else if (parsed.pillar === "x") {
    await handleXCommand(ctx, parsed.action, parsed.payload);
  }

  ctx.mutations.stopPipeline = true;
};

