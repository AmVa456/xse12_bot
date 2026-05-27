import { BucketDefinition } from "src/router/types";
import { loggingPipe } from "src/pipes/common/loggingPipe";
import { authPipe } from "src/pipes/common/authPipe";
import { commandPipe } from "src/pipes/common/commandPipe";

const SYSTEM_COMMANDS = [
  "/sys",
  "/pipe",
  "/net",
  "/db",
  "/ai",
  "/media",
  "/x",
  "/spawn_bot",
  "/purge_bot",
  "/list_bots",
  "/route_bot",
  "/pause_bot",
  "/resume_bot",
  "/scrape",
  "/sync_store",
  "/queue_status",
  "/retry_job",
  "/purge_dlq",
  "/sys_health",
  "/tail_logs",
];

export const systemBucket: BucketDefinition = {
  name: "system",
  match(event) {
    const text = (event.text || "").trim().split(/\s+/)[0];
    return (
      event.type === "system_event" ||
      event.type === "unknown" ||
      event.type === "callback_query" ||
      SYSTEM_COMMANDS.includes(text)
    );
  },
  pipes: [loggingPipe, authPipe, commandPipe],
};

