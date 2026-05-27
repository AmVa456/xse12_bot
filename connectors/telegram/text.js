import aiReply from "./ai.js";

export default async function textPipe(event, sender, aiClient) {
  const { chat_id } = event;

  const reply = await aiReply(event, aiClient);

  await sender.sendText(chat_id, reply);
}
