import fs from "fs";
import path from "path";

export default function loadSession(userId) {
  const sessionPath = path.resolve(`buckets/xTab/telegram/sessions/${userId}.json`);

  if (!fs.existsSync(sessionPath)) {
    return {
      user_id: userId,
      state: "idle",
      last_message: null,
      last_intent: null,
      context: {},
      updated_at: Date.now()
    };
  }

  return JSON.parse(fs.readFileSync(sessionPath, "utf8"));
}
