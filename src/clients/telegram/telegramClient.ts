import {
  AnswerInlineQueryRequest,
  CopyMessageRequest,
  EditMessageTextRequest,
  SendDocumentRequest,
  SendPhotoRequest,
  SendVideoRequest,
  SendChatActionRequest,
  SetMyCommandsRequest,
  SendMessageRequest,
  SetWebhookRequest,
  TelegramApiResponse,
  TelegramBotUser,
  TelegramMessage,
} from "./telegramTypes";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export class TelegramApiError extends Error {
  readonly status: number;
  readonly description?: string;

  constructor(message: string, status: number, description?: string) {
    super(message);
    this.name = "TelegramApiError";
    this.status = status;
    this.description = description;
  }
}

export type TelegramClient = {
  getMe(): Promise<TelegramBotUser>;
  sendMessage(input: SendMessageRequest): Promise<TelegramMessage>;
  editMessageText(input: EditMessageTextRequest): Promise<TelegramMessage>;
  answerInlineQuery(input: AnswerInlineQueryRequest): Promise<true>;
  setWebhook(input: SetWebhookRequest): Promise<true>;
  setMyCommands(input: SetMyCommandsRequest): Promise<true>;
  sendChatAction(input: SendChatActionRequest): Promise<true>;
  sendPhoto(input: SendPhotoRequest): Promise<TelegramMessage>;
  sendVideo(input: SendVideoRequest): Promise<TelegramMessage>;
  sendDocument(input: SendDocumentRequest): Promise<TelegramMessage>;
  copyMessage(input: CopyMessageRequest): Promise<number>;
  answerCallbackQuery(id: string, text?: string): Promise<true>;
};

export function createTelegramClient(botToken: string, baseUrl?: string): TelegramClient {
  if (!botToken) {
    throw new Error("Missing Telegram bot token.");
  }

  const resolvedBase = `${baseUrl || TELEGRAM_API_BASE}/bot${botToken}`;

  async function requestTelegram<T>(method: string, body?: unknown): Promise<T> {
    const response = await fetch(`${resolvedBase}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    let payload: TelegramApiResponse<T>;
    try {
      payload = (await response.json()) as TelegramApiResponse<T>;
    } catch {
      throw new TelegramApiError("Telegram API returned non-JSON response.", response.status);
    }

    if (!response.ok || !payload.ok || payload.result === undefined) {
      throw new TelegramApiError(
        `Telegram API request failed for method ${method}.`,
        response.status,
        payload.description
      );
    }

    return payload.result;
  }

  return {
    getMe() {
      return requestTelegram<TelegramBotUser>("getMe");
    },

    sendMessage(input: SendMessageRequest) {
      return requestTelegram<TelegramMessage>("sendMessage", input);
    },

    editMessageText(input: EditMessageTextRequest) {
      return requestTelegram<TelegramMessage>("editMessageText", input);
    },

    answerInlineQuery(input: AnswerInlineQueryRequest) {
      return requestTelegram<true>("answerInlineQuery", input);
    },

    setWebhook(input: SetWebhookRequest) {
      return requestTelegram<true>("setWebhook", input);
    },

    setMyCommands(input: SetMyCommandsRequest) {
      return requestTelegram<true>("setMyCommands", input);
    },

    sendChatAction(input: SendChatActionRequest) {
      return requestTelegram<true>("sendChatAction", input);
    },

    sendPhoto(input: SendPhotoRequest) {
      return requestTelegram<TelegramMessage>("sendPhoto", input);
    },

    sendVideo(input: SendVideoRequest) {
      return requestTelegram<TelegramMessage>("sendVideo", input);
    },

    sendDocument(input: SendDocumentRequest) {
      return requestTelegram<TelegramMessage>("sendDocument", input);
    },

    copyMessage(input: CopyMessageRequest) {
      return requestTelegram<number>("copyMessage", input);
    },

    answerCallbackQuery(id: string, text?: string) {
      return requestTelegram<true>("answerCallbackQuery", {
        callback_query_id: id,
        text,
      });
    },
  };
}
