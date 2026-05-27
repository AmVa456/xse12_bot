export default async function state_profile_age(event, session, sender) {
  const { chat_id, content } = event;

  session.context.name = content.text;

  await sender.sendText(chat_id, "How old are you?");
  session.state = "profile_age";
}
