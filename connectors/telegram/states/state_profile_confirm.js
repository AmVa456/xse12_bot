export default async function state_profile_confirm(event, session, sender) {
  const { chat_id, content } = event;

  session.context.age = content.text;

  await sender.sendText(
    chat_id,
    `Confirm your profile:\nName: ${session.context.name}\nAge: ${session.context.age}\n\nType "yes" or "no".`
  );

  session.state = "profile_confirm";
}
