export default async function commandPipe(event, sender) {
  const { chat_id, command } = event;

  switch (command.name) {
    case "start":
      return sender.sendText(chat_id, "Welcome to xSeries Bot!");
    case "help":
      return sender.sendText(chat_id, "Available commands: /start /help /setname");
    case "setname":
      return sender.sendText(chat_id, `Okay, I’ll call you ${command.args.join(" ")}`);
    default:
      return sender.sendText(chat_id, "Unknown command.");
  }
}
