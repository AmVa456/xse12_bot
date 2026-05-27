export default function updateMemory(memory, event) {
  const text = event.content?.text?.toLowerCase() || "";

  // Example: detect name
  if (text.startsWith("my name is ")) {
    const name = text.replace("my name is ", "").trim();
    memory.facts = memory.facts.filter(f => !f.startsWith("name:"));
    memory.facts.push(`name:${name}`);
  }

  // Example: detect preferences
  if (text.includes("i like ")) {
    const pref = text.split("i like ")[1].trim();
    memory.preferences[pref] = true;
  }

  // Add to history
  memory.history.push({
    message: event.content?.text || null,
    timestamp: Date.now()
  });

  return memory;
}
