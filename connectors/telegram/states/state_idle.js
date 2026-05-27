export default async function state_idle(event, session, sender) {
  const { chat_id } = event;

  await sender.sendText(chat_id, "Profile saved. You're back to idle.");
  session.state = "idle";
  session.context = {};
}
