import { TelegramMessage, TelegramUpdate } from "src/clients/telegram/telegramTypes";

export type MediaRef = {
  type: "photo" | "video" | "document" | "audio";
  fileId: string;
  fileSize?: number;
};

export function extractMediaRefFromMessage(message?: TelegramMessage): MediaRef | undefined {
  if (!message) {
    return undefined;
  }

  if (Array.isArray(message.photo) && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1];
    if (largest?.file_id) {
      return { type: "photo", fileId: largest.file_id, fileSize: largest.file_size };
    }
  }

  if (message.video?.file_id) {
    return { type: "video", fileId: message.video.file_id, fileSize: message.video.file_size };
  }

  if (message.document?.file_id) {
    return { type: "document", fileId: message.document.file_id, fileSize: message.document.file_size };
  }

  if (message.audio?.file_id) {
    return { type: "audio", fileId: message.audio.file_id, fileSize: message.audio.file_size };
  }

  return undefined;
}

export function extractMediaRefFromUpdate(update: TelegramUpdate): MediaRef | undefined {
  return extractMediaRefFromMessage(update.message || update.edited_message);
}
