import fs from "fs";
import path from "path";

export default function storeMedia(fileId, media) {
  const ext = media.mime?.split("/")[1] || "bin";
  const filename = `${fileId}.${ext}`;

  const dir = path.resolve("buckets/xTab/telegram/media");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, media.buffer);

  return {
    local_path: fullPath,
    mime: media.mime,
    size: media.size,
    file_path: media.filePath
  };
}
