import { Bot, ManagedBotSettings, OperatorAuditEntry, SessionState, UserState } from "src/state/models";
import Database from "better-sqlite3";

export type QueryResult = {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
};

export type NodeHeartbeat = {
  nodeId: string;
  status: string;
  updatedAt: string;
};

export type MediaVaultEntry = {
  alias: string;
  fileId: string;
  type: "photo" | "video" | "document" | "audio";
  addedBy?: string;
  fileSize?: number;
  createdAt: string;
};

export type DbClient = {
  getOrCreateUserByTelegramId(telegramUserId: number, username?: string): Promise<UserState>;
  getUserByTelegramId(telegramUserId: number): Promise<UserState | undefined>;
  upsertUser(user: UserState): Promise<void>;
  getSession(key: string): Promise<SessionState | undefined>;
  upsertSession(session: SessionState): Promise<void>;
  setSetting(key: string, value: string): Promise<ManagedBotSettings>;
  getSetting(key: string): Promise<ManagedBotSettings | undefined>;
  addAuditEntry(entry: OperatorAuditEntry): Promise<void>;
  registerBot(bot: Partial<Bot>): Promise<Bot>;
  listBots(): Promise<Bot[]>;
  updateBotStatus(botId: number, status: Bot["status"]): Promise<void>;
  updateBotRouting(botId: number, bucket: string): Promise<void>;
  runQuery(sql: string): Promise<QueryResult>;
  flushSessionWindow(sessionKey: string): Promise<boolean>;
  listNodeHeartbeats(): Promise<NodeHeartbeat[]>;
  upsertNodeHeartbeat(nodeId: string, status?: string): Promise<void>;
  saveMediaAlias(entry: Omit<MediaVaultEntry, "createdAt">): Promise<MediaVaultEntry>;
  getMediaAlias(alias: string): Promise<MediaVaultEntry | undefined>;
};

class InMemoryDbClient implements DbClient {
  private users = new Map<number, UserState>();
  private sessions = new Map<string, SessionState>();
  private settings = new Map<string, ManagedBotSettings>();
  private auditEntries: OperatorAuditEntry[] = [];
  private bots = new Map<number, Bot>();
  private mediaVault = new Map<string, MediaVaultEntry>();
  private nextBotId = 1;

  async getOrCreateUserByTelegramId(telegramUserId: number, username?: string): Promise<UserState> {
    const existing = this.users.get(telegramUserId);
    if (existing) {
      const updated: UserState = {
        ...existing,
        username: username ?? existing.username,
        updatedAt: new Date().toISOString(),
      };
      this.users.set(telegramUserId, updated);
      return updated;
    }

    const now = new Date().toISOString();
    const created: UserState = {
      id: `u_${telegramUserId}`,
      telegramUserId,
      username,
      roles: [],
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(telegramUserId, created);
    return created;
  }

  async getUserByTelegramId(telegramUserId: number): Promise<UserState | undefined> {
    return this.users.get(telegramUserId);
  }

  async upsertUser(user: UserState): Promise<void> {
    this.users.set(user.telegramUserId, user);
  }

  async getSession(key: string): Promise<SessionState | undefined> {
    return this.sessions.get(key);
  }

  async upsertSession(session: SessionState): Promise<void> {
    this.sessions.set(session.key, session);
  }

  async setSetting(key: string, value: string): Promise<ManagedBotSettings> {
    const setting = { key, value, updatedAt: new Date().toISOString() };
    this.settings.set(key, setting);
    return setting;
  }

  async getSetting(key: string): Promise<ManagedBotSettings | undefined> {
    return this.settings.get(key);
  }

  async addAuditEntry(entry: OperatorAuditEntry): Promise<void> {
    this.auditEntries.push(entry);
  }

  async registerBot(bot: Partial<Bot>): Promise<Bot> {
    if (!bot.token) {
      throw new Error("Bot token is required to register a bot.");
    }

    const now = new Date().toISOString();
    const created: Bot = {
      botId: this.nextBotId++,
      token: bot.token,
      username: bot.username,
      displayName: bot.displayName,
      purposeTag: bot.purposeTag,
      routingBucket: bot.routingBucket,
      status: bot.status || "active",
      createdAt: now,
      updatedAt: now,
    };
    this.bots.set(created.botId!, created);
    return created;
  }

  async listBots(): Promise<Bot[]> {
    return Array.from(this.bots.values());
  }

  async updateBotStatus(botId: number, status: Bot["status"]): Promise<void> {
    const existing = this.bots.get(botId);
    if (!existing) {
      return;
    }
    this.bots.set(botId, {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateBotRouting(botId: number, bucket: string): Promise<void> {
    const existing = this.bots.get(botId);
    if (!existing) {
      return;
    }
    this.bots.set(botId, {
      ...existing,
      routingBucket: bucket,
      updatedAt: new Date().toISOString(),
    });
  }

  async runQuery(sql: string): Promise<QueryResult> {
    throw new Error("Raw query execution is unavailable for in-memory DB mode.");
  }

  async flushSessionWindow(sessionKey: string): Promise<boolean> {
    return this.sessions.delete(sessionKey);
  }

  async listNodeHeartbeats(): Promise<NodeHeartbeat[]> {
    return [];
  }

  async upsertNodeHeartbeat(_nodeId: string, _status = "active"): Promise<void> {
    return;
  }

  async saveMediaAlias(entry: Omit<MediaVaultEntry, "createdAt">): Promise<MediaVaultEntry> {
    const created: MediaVaultEntry = {
      ...entry,
      createdAt: new Date().toISOString(),
    };
    this.mediaVault.set(entry.alias.toLowerCase(), created);
    return created;
  }

  async getMediaAlias(alias: string): Promise<MediaVaultEntry | undefined> {
    return this.mediaVault.get(alias.toLowerCase());
  }
}

class SqliteDbClient implements DbClient {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath.replace("sqlite://", ""));
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.ensureSchema();
  }

  private ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        tg_user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        flags TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        tg_user_id INTEGER,
        data TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        context TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bots (
        bot_id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        username TEXT,
        display_name TEXT,
        purpose_tag TEXT,
        routing_bucket TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS node_heartbeats (
        node_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS media_vault (
        alias TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        added_by TEXT,
        file_size INTEGER,
        created_at TEXT NOT NULL
      );
    `);

    const mediaColumns = this.db
      .prepare("PRAGMA table_info(media_vault)")
      .all() as Array<{ name: string }>;
    const hasFileSizeColumn = mediaColumns.some((column) => column.name === "file_size");
    if (!hasFileSizeColumn) {
      this.db.exec("ALTER TABLE media_vault ADD COLUMN file_size INTEGER");
    }
  }

  async getOrCreateUserByTelegramId(telegramUserId: number, username?: string): Promise<UserState> {
    const row = this.db.prepare("SELECT * FROM users WHERE tg_user_id = ?").get(telegramUserId) as any;
    if (row) {
      if (username && row.username !== username) {
        this.db.prepare("UPDATE users SET username = ?, last_seen_at = CURRENT_TIMESTAMP WHERE tg_user_id = ?").run(username, telegramUserId);
        return {
          id: `u_${telegramUserId}`,
          telegramUserId,
          username,
          roles: JSON.parse(row.flags || "{}").roles || [],
          createdAt: row.first_seen_at,
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        id: `u_${telegramUserId}`,
        telegramUserId,
        username: row.username,
        roles: JSON.parse(row.flags || "{}").roles || [],
        createdAt: row.first_seen_at,
        updatedAt: row.last_seen_at,
      };
    }

    const now = new Date().toISOString();
    this.db.prepare("INSERT INTO users (tg_user_id, username, first_seen_at, last_seen_at, flags) VALUES (?, ?, ?, ?, ?)").run(
      telegramUserId,
      username,
      now,
      now,
      JSON.stringify({ roles: [] })
    );

    return {
      id: `u_${telegramUserId}`,
      telegramUserId,
      username,
      roles: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  async getUserByTelegramId(telegramUserId: number): Promise<UserState | undefined> {
    const row = this.db.prepare("SELECT * FROM users WHERE tg_user_id = ?").get(telegramUserId) as any;
    if (!row) return undefined;
    return {
      id: `u_${telegramUserId}`,
      telegramUserId,
      username: row.username,
      roles: JSON.parse(row.flags || "{}").roles || [],
      createdAt: row.first_seen_at,
      updatedAt: row.last_seen_at,
    };
  }

  async upsertUser(user: UserState): Promise<void> {
    this.db.prepare("UPDATE users SET username = ?, flags = ?, last_seen_at = ? WHERE tg_user_id = ?").run(
      user.username,
      JSON.stringify({ roles: user.roles }),
      user.updatedAt,
      user.telegramUserId
    );
  }

  async getSession(key: string): Promise<SessionState | undefined> {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(key) as any;
    if (!row) return undefined;
    return {
      key: row.id,
      userId: row.tg_user_id ? `u_${row.tg_user_id}` : undefined,
      data: JSON.parse(row.data || "{}"),
      updatedAt: row.updated_at,
    };
  }

  async upsertSession(session: SessionState): Promise<void> {
    const tgUserId = session.userId ? Number.parseInt(session.userId.replace("u_", ""), 10) : null;
    this.db.prepare("INSERT INTO sessions (id, tg_user_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET tg_user_id = excluded.tg_user_id, data = excluded.data, updated_at = excluded.updated_at").run(
      session.key,
      tgUserId,
      JSON.stringify(session.data),
      session.updatedAt
    );
  }

  async setSetting(key: string, value: string): Promise<ManagedBotSettings> {
    const now = new Date().toISOString();
    this.db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(
      key,
      value,
      now
    );
    return { key, value, updatedAt: now };
  }

  async getSetting(key: string): Promise<ManagedBotSettings | undefined> {
    const row = this.db.prepare("SELECT * FROM settings WHERE key = ?").get(key) as any;
    if (!row) return undefined;
    return { key: row.key, value: row.value, updatedAt: row.updated_at };
  }

  async addAuditEntry(entry: OperatorAuditEntry): Promise<void> {
    this.db.prepare("INSERT INTO logs (source, level, message, context, created_at) VALUES (?, ?, ?, ?, ?)").run(
      "operator_audit",
      "info",
      entry.action,
      JSON.stringify(entry.metadata || {}),
      entry.createdAt
    );
  }

  async registerBot(bot: Partial<Bot>): Promise<Bot> {
    const now = new Date().toISOString();
    const result = this.db.prepare("INSERT INTO bots (token, username, display_name, purpose_tag, routing_bucket, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
      bot.token,
      bot.username,
      bot.displayName,
      bot.purposeTag,
      bot.routingBucket,
      bot.status || "active",
      now,
      now
    );
    return {
      botId: result.lastInsertRowid as number,
      token: bot.token!,
      username: bot.username,
      displayName: bot.displayName,
      purposeTag: bot.purposeTag,
      routingBucket: bot.routingBucket,
      status: (bot.status as any) || "active",
      createdAt: now,
      updatedAt: now,
    };
  }

  async listBots(): Promise<Bot[]> {
    const rows = this.db.prepare("SELECT * FROM bots").all() as any[];
    return rows.map(row => ({
      botId: row.bot_id,
      token: row.token,
      username: row.username,
      displayName: row.display_name,
      purposeTag: row.purpose_tag,
      routingBucket: row.routing_bucket,
      status: row.status as any,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async updateBotStatus(botId: number, status: Bot["status"]): Promise<void> {
    this.db.prepare("UPDATE bots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE bot_id = ?").run(status, botId);
  }

  async updateBotRouting(botId: number, bucket: string): Promise<void> {
    this.db.prepare("UPDATE bots SET routing_bucket = ?, updated_at = CURRENT_TIMESTAMP WHERE bot_id = ?").run(bucket, botId);
  }

  async runQuery(sql: string): Promise<QueryResult> {
    const statement = this.db.prepare(sql);
    if (statement.reader) {
      const rows = statement.all() as Array<Record<string, unknown>>;
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
      return {
        columns,
        rows,
        rowCount: rows.length,
      };
    }

    const result = statement.run();
    return {
      columns: ["changes", "lastInsertRowid"],
      rows: [
        {
          changes: result.changes,
          lastInsertRowid: Number(result.lastInsertRowid || 0),
        },
      ],
      rowCount: Number(result.changes || 0),
    };
  }

  async flushSessionWindow(sessionKey: string): Promise<boolean> {
    const result = this.db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionKey);
    return result.changes > 0;
  }

  async listNodeHeartbeats(): Promise<NodeHeartbeat[]> {
    const rows = this.db
      .prepare("SELECT node_id, status, updated_at FROM node_heartbeats ORDER BY updated_at DESC")
      .all() as Array<{ node_id: string; status: string; updated_at: string }>;
    return rows.map((row) => ({
      nodeId: row.node_id,
      status: row.status,
      updatedAt: row.updated_at,
    }));
  }

  async upsertNodeHeartbeat(nodeId: string, status = "active"): Promise<void> {
    this.db
      .prepare(
        "INSERT INTO node_heartbeats (node_id, status, updated_at) VALUES (?, ?, ?) ON CONFLICT(node_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at"
      )
      .run(nodeId, status, new Date().toISOString());
  }

  async saveMediaAlias(entry: Omit<MediaVaultEntry, "createdAt">): Promise<MediaVaultEntry> {
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO media_vault (alias, file_id, media_type, added_by, file_size, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(alias) DO UPDATE SET file_id = excluded.file_id, media_type = excluded.media_type, added_by = excluded.added_by, file_size = excluded.file_size"
      )
      .run(entry.alias.toLowerCase(), entry.fileId, entry.type, entry.addedBy || null, entry.fileSize || null, createdAt);

    return {
      ...entry,
      alias: entry.alias.toLowerCase(),
      createdAt,
    };
  }

  async getMediaAlias(alias: string): Promise<MediaVaultEntry | undefined> {
    const row = this.db
      .prepare("SELECT alias, file_id, media_type, added_by, file_size, created_at FROM media_vault WHERE alias = ?")
      .get(alias.toLowerCase()) as
      | {
          alias: string;
          file_id: string;
          media_type: "photo" | "video" | "document" | "audio";
          added_by?: string;
          file_size?: number;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      alias: row.alias,
      fileId: row.file_id,
      type: row.media_type,
      addedBy: row.added_by,
      fileSize: row.file_size,
      createdAt: row.created_at,
    };
  }
}

function shouldFallbackToInMemory(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "ERR_DLOPEN_FAILED" ||
    message.includes("better_sqlite3.node") ||
    message.includes("not a valid win32 application") ||
    message.includes("could not locate the bindings file")
  );
}

export function createDbClient(dbUrl: string): DbClient {
  if (dbUrl.startsWith("sqlite://")) {
    try {
      return new SqliteDbClient(dbUrl);
    } catch (error) {
      if (shouldFallbackToInMemory(error)) {
        console.warn(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: "warn",
            message: "SQLite native driver unavailable; falling back to in-memory DB client.",
          })
        );
        return new InMemoryDbClient();
      }
      throw error;
    }
  }

  throw new Error("Unsupported DB URL for this implementation.");
}
