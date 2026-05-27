export default async function state_profile_name(event, session, sender) {
  const { chat_id } = event;

  await sender.sendText(chat_id, "What is your name?");
  session.state = "profile_name";
}
