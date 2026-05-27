import fetch from "node-fetch";

export default async function downloadMedia(fileId, token) {
  const api = `https://api.telegram.org/bot${token}`;
  const fileInfo = await fetch(`${api}/getFile?file_id=${fileId}`).then(r => r.json());

  if (!fileInfo.ok) throw new Error("Failed to get file info");

  const filePath = fileInfo.result.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const fileRes = await fetch(fileUrl);
  const buffer = await fileRes.arrayBuffer();

  return {
    buffer: Buffer.from(buffer),
    filePath,
    mime: fileRes.headers.get("content-type"),
    size: Number(fileRes.headers.get("content-length"))
  };
}
