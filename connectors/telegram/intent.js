import fs from "fs";
import path from "path";

/**
 * intent.js
 * ---------
 * Maps AI-detected intents to action handlers.
 */

export default async function intentPipe(event, sender) {
  const { chat_id, intent } = event;

  // Load intent → action map
  const mapPath = path.resolve("buckets/xGem/telegram/intents/map.json");
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));

  const actionName = map[intent];

  if (!actionName) {
    return sender.sendText(chat_id, "I'm not sure how to handle that yet.");
  }

  // Load action handler dynamically
  const actionModule = await import(`./actions/${actionName}.js`);
  const action = actionModule.default;

  // Execute action
  const result = await action(event);

  // Send result to user
  await sender.sendText(chat_id, result);
}
