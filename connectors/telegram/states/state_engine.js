import fs from "fs";
import path from "path";

export default async function runStateEngine(event, session, sender) {
  const state = session.state || "idle";

  const handlerPath = path.resolve(`connectors/telegram/states/state_${state}.js`);

  if (!fs.existsSync(handlerPath)) {
    await sender.sendText(event.chat_id, "State error: no handler.");
    session.state = "idle";
    return session;
  }

  const handler = (await import(handlerPath)).default;

  await handler(event, session, sender);

  return session;
}
