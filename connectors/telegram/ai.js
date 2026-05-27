import fs from "fs";
import path from "path";

/**
 * ai.js
 * -----
 * AI reply generator for Telegram text messages.
 * Loads persona + templates from xGem and generates a reply.
 */

export default async function aiReply(event, aiClient) {
  const { content } = event;

  // Load persona + templates
  const promptPath = path.resolve("buckets/xGem/telegram/prompts/reply.json");
  const promptData = JSON.parse(fs.readFileSync(promptPath, "utf8"));

  const persona = promptData.persona;
  const templates = promptData.reply_templates;

  // Build AI context
  const systemPrompt = `
You are ${persona.name}.
Tone: ${persona.tone}.
Rules:
${persona.rules.map(r => "- " + r).join("\n")}
`;

  const userMessage = content.text;

  // Call your AI model (Gemini, Claude, OpenAI, etc.)
  const aiResponse = await aiClient.generate({
    system: systemPrompt,
    user: userMessage
  });

  // Fallback if AI fails
  const reply = aiResponse || templates.fallback;

  return reply;
}
