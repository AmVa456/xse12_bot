import fs from "fs";
import path from "path";

export default function loadMemory(userId) {
  const memoryPath = path.resolve(`buckets/xGem/telegram/memory/${userId}.json`);

  if (!fs.existsSync(memoryPath)) {
    return {
      user_id: userId,
      facts: [],
      preferences: {},
      history: [],
      updated_at: Date.now()
    };
  }

  return JSON.parse(fs.readFileSync(memoryPath, "utf8"));
}
