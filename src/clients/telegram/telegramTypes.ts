export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  inline_query?: TelegramInlineQuery;
  my_chat_member?: TelegramChatMemberUpdate;
  chat_member?: TelegramChatMemberUpdate;
  business_connection?: TelegramBusinessConnection;
};

export type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
};

export type TelegramUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TelegramBotUser = TelegramUser & {
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  can_connect_to_business?: boolean;
  has_main_web_app?: boolean;
};

export type TelegramMessage = {
  message_id: number;
  date: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  photo?: Array<{
    file_id: string;
    width: number;
    height: number;
    file_unique_id?: string;
    file_size?: number;
  }>;
  video?: {
    file_id: string;
    width: number;
    height: number;
    duration?: number;
    file_unique_id?: string;
    file_size?: number;
  };
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_unique_id?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    duration?: number;
    performer?: string;
    title?: string;
    file_name?: string;
    mime_type?: string;
    file_unique_id?: string;
    file_size?: number;
  };
  reply_to_message?: TelegramMessage;
};

export type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
};

export type TelegramInlineQuery = {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
};

export type TelegramChatMemberUpdate = {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
};

export type TelegramBusinessConnection = {
  id: string;
  user: TelegramUser;
};

export type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

export type SendMessageRequest = {
  chat_id: number;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
  disable_web_page_preview?: boolean;
  reply_to_message_id?: number;
};

export type EditMessageTextRequest = {
  chat_id: number;
  message_id: number;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML" | "Markdown";
};

export type SetWebhookRequest = {
  url: string;
  secret_token?: string;
  allowed_updates?: string[];
};

export type SendChatActionRequest = {
  chat_id: number;
  action: "typing";
};

export type SendPhotoRequest = {
  chat_id: number;
  photo: string;
  caption?: string;
};

export type SendVideoRequest = {
  chat_id: number;
  video: string;
  caption?: string;
};

export type SendDocumentRequest = {
  chat_id: number;
  document: string;
  caption?: string;
};

export type CopyMessageRequest = {
  chat_id: number;
  from_chat_id: number;
  message_id: number;
};

export type BotCommand = {
  command: string;
  description: string;
};

export type SetMyCommandsRequest = {
  commands: BotCommand[];
  scope?: Record<string, unknown>;
  language_code?: string;
};

export type InlineQueryResultArticle = {
  type: "article";
  id: string;
  title: string;
  description?: string;
  input_message_content: {
    message_text: string;
  };
};

export type AnswerInlineQueryRequest = {
  inline_query_id: string;
  results: InlineQueryResultArticle[];
  cache_time?: number;
  is_personal?: boolean;
};
