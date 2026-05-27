import fs from "fs";
import path from "path";
import loadMemory from "./memory_load.js";
import saveMemory from "./memory_save.js";
import updateMemory from "./memory_update.js";

export default async function aiReply(event, aiClient) {
  const { user } = event;

  // Load memory
  const memory = loadMemory(user.id);

  // Update memory based on message
  const updatedMemory = updateMemory(memory, event);
  saveMemory(updatedMemory);

  // Build memory context
  const memoryContext = `
User Facts:
${updatedMemory.facts.map(f => "- " + f).join("\n")}

User Preferences:
${Object.keys(updatedMemory.preferences).map(p => "- likes " + p).join("\n")}
`;

  // Load persona + templates
  const promptPath = path.resolve("buckets/xGem/telegram/prompts/reply.json");
  const promptData = JSON.parse(fs.readFileSync(promptPath, "utf8"));

  const persona = promptData.persona;

  const systemPrompt = `
You are ${persona.name}.
Tone: ${persona.tone}.

User Memory:
${memoryContext}

Rules:
${persona.rules.map(r => "- " + r).join("\n")}
`;

  const userMessage = event.content.text;

  const aiResponse = await aiClient.generate({
    system: systemPrompt,
    user: userMessage
  });

  return aiResponse || promptData.reply_templates.fallback;
}
