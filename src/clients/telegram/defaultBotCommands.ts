import { BotCommand } from "src/clients/telegram/telegramTypes";

export const DEFAULT_BOT_COMMANDS: BotCommand[] = [
  { command: "sys", description: "System operations." },
  { command: "pipe", description: "Pipeline controls." },
  { command: "net", description: "Network checks and calls." },
  { command: "db", description: "Database operations." },
  { command: "media", description: "Media router actions." },
  { command: "ai", description: "Architect coding assistant." },
  { command: "x", description: "Extended diagnostics." },
];
