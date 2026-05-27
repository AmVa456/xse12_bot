import fs from "fs";
import path from "path";

export default function saveMemory(memory) {
  const memoryPath = path.resolve(`buckets/xGem/telegram/memory/${memory.user_id}.json`);
  memory.updated_at = Date.now();
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), "utf8");
}
