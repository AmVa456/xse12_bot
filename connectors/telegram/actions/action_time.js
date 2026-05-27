export default async function action_time(event) {
  return "The current time is: " + new Date().toLocaleTimeString();
}
