export type UserState = {
  id: string;
  telegramUserId: number;
  username?: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

export type ChatState = {
  chatId: number;
  chatType: string;
  title?: string;
  updatedAt: string;
};

export type SessionState = {
  key: string;
  userId?: string;
  data: Record<string, unknown>;
  updatedAt: string;
};

export type ManagedBotSettings = {
  key: string;
  value: string;
  updatedAt: string;
};

export type Bot = {
  botId?: number;
  token: string;
  username?: string;
  displayName?: string;
  purposeTag?: string;
  routingBucket?: string;
  status: "active" | "paused" | "purged";
  createdAt: string;
  updatedAt: string;
};

export type OutboundOperation =
  | {
      type: "sendMessage";
      chatId: number;
      text: string;
      parseMode?: "MarkdownV2" | "HTML" | "Markdown";
    }
  | {
      type: "editMessageText";
      chatId: number;
      messageId: number;
      text: string;
      parseMode?: "MarkdownV2" | "HTML" | "Markdown";
    }
  | {
      type: "answerCallbackQuery";
      callbackQueryId: string;
      text?: string;
    }
  | {
      type: "answerInlineQuery";
      inlineQueryId: string;
      results: Array<{
        id: string;
        title: string;
        messageText: string;
        description?: string;
      }>;
      cacheTime?: number;
      isPersonal?: boolean;
    }
  | {
      type: "sendChatAction";
      chatId: number;
      action: "typing";
    }
  | {
      type: "sendPhoto";
      chatId: number;
      fileId: string;
      caption?: string;
    }
  | {
      type: "sendVideo";
      chatId: number;
      fileId: string;
      caption?: string;
    }
  | {
      type: "sendDocument";
      chatId: number;
      fileId: string;
      caption?: string;
    }
  | {
      type: "copyMessage";
      chatId: number;
      fromChatId: number;
      messageId: number;
    };

export type RouteMutations = {
  userState?: UserState;
  chatState?: ChatState;
  sessionState?: SessionState;
  outbound: OutboundOperation[];
  stopPipeline?: boolean;
};

export type OperatorAuditEntry = {
  id: string;
  actorUserId: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
