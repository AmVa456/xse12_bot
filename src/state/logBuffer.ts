export type BufferedLogEntry = {
  ts: string;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
};

const MAX_LOG_BUFFER = 200;
const LOG_BUFFER: BufferedLogEntry[] = [];

export function appendBufferedLog(entry: BufferedLogEntry): void {
  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_LOG_BUFFER) {
    LOG_BUFFER.splice(0, LOG_BUFFER.length - MAX_LOG_BUFFER);
  }
}

export function readBufferedLogs(limit = 15): BufferedLogEntry[] {
  if (limit <= 0) {
    return [];
  }
  return LOG_BUFFER.slice(-limit);
}

