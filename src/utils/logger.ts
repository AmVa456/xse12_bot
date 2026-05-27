import { appendBufferedLog } from "src/state/logBuffer";

export type LogMeta = Record<string, unknown>;

export type Logger = {
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
};

function log(level: string, message: string, meta?: LogMeta): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ?? {}),
  };
  appendBufferedLog({
    ts: payload.ts,
    level,
    message,
    meta,
  });

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function createLogger(): Logger {
  return {
    info(message, meta) {
      log("info", message, meta);
    },
    warn(message, meta) {
      log("warn", message, meta);
    },
    error(message, meta) {
      log("error", message, meta);
    },
    debug(message, meta) {
      if (process.env.NODE_ENV !== "production") {
        log("debug", message, meta);
      }
    },
  };
}
