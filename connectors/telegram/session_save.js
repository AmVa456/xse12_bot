import fs from "fs";
import path from "path";

export default function saveSession(session) {
  const sessionPath = path.resolve(`buckets/xTab/telegram/sessions/${session.user_id}.json`);

  session.updated_at = Date.now();

  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf8");
}
