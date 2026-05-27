export const CHAT_UI_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>xser12 Gemini Console</title>
    <link rel="stylesheet" href="/ui.css" />
  </head>
  <body>
    <div class="bg-orb orb-a"></div>
    <div class="bg-orb orb-b"></div>
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyeline">xSeries AI Workspace</p>
          <h1>Gemini Chat Console</h1>
        </div>
        <div class="topbar-actions">
          <span id="model-chip" class="model-chip">Model: gemini-1.5-flash</span>
          <button id="new-thread-btn" class="ghost-btn" type="button">New Thread</button>
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar">
          <h2>Threads</h2>
          <div id="thread-list" class="thread-list"></div>
          <div class="sidebar-note">
            <h3>Quick prompts</h3>
            <div class="quick-prompts">
              <button class="quick-prompt" data-prompt="Help me draft a product roadmap for Q3 with milestones.">Roadmap</button>
              <button class="quick-prompt" data-prompt="Summarize this week and suggest priorities for tomorrow.">Daily review</button>
              <button class="quick-prompt" data-prompt="Design a Telegram bot command UX with clear help text.">Command UX</button>
            </div>
          </div>
        </aside>

        <main class="chat-panel">
          <div id="messages" class="messages" aria-live="polite"></div>
          <form id="composer-form" class="composer">
            <label class="composer-label" for="composer-input">Message</label>
            <textarea id="composer-input" rows="3" placeholder="Ask Gemini anything..." required></textarea>
            <div class="composer-meta">
              <p>Press Enter to send, Shift+Enter for a new line.</p>
              <button id="send-btn" class="send-btn" type="submit">Send</button>
            </div>
          </form>
        </main>
      </div>
    </div>
    <script src="/ui.js" type="module"></script>
  </body>
</html>
`;

export const CHAT_UI_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap");

:root {
  --bg: #f5f8f7;
  --panel: #ffffff;
  --panel-soft: #eef3f2;
  --text: #101b1a;
  --muted: #5f7370;
  --border: #d8e4e1;
  --accent: #0f8f78;
  --accent-ink: #ffffff;
  --assistant: #ecf7f4;
  --user: #0f8f78;
  --radius-xl: 20px;
  --radius-md: 12px;
  --shadow: 0 18px 44px rgba(15, 40, 36, 0.08);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: "Space Grotesk", sans-serif;
  background: radial-gradient(1200px 700px at 0% 0%, #dcefeb 0%, transparent 55%), var(--bg);
  color: var(--text);
}

.bg-orb {
  position: fixed;
  z-index: 0;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  filter: blur(44px);
  opacity: 0.35;
  pointer-events: none;
}

.orb-a {
  background: #67c8b4;
  top: -120px;
  right: 10%;
}

.orb-b {
  background: #ffc37a;
  bottom: -140px;
  left: 8%;
}

.shell {
  position: relative;
  z-index: 1;
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px;
}

.topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.eyeline {
  margin: 0 0 2px;
  font-family: "IBM Plex Mono", monospace;
  font-size: 12px;
  color: var(--muted);
}

h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 40px);
  line-height: 1;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-chip {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--muted);
}

.ghost-btn {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
}

.workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}

.sidebar {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, #ffffff 0%, #f6fbfa 100%);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 70vh;
}

.sidebar h2,
.sidebar h3 {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.01em;
}

.thread-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thread-item {
  border: 1px solid transparent;
  background: var(--panel-soft);
  border-radius: 10px;
  padding: 10px;
  cursor: pointer;
  text-align: left;
  font-size: 14px;
  color: var(--text);
}

.thread-item.active {
  border-color: var(--accent);
  background: #ddf4ef;
}

.sidebar-note {
  margin-top: auto;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.quick-prompts {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-prompt {
  border: 0;
  background: #0f8f7814;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: "Space Grotesk", sans-serif;
  color: #0f6d5b;
  cursor: pointer;
}

.chat-panel {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  min-height: 70vh;
  display: grid;
  grid-template-rows: 1fr auto;
  overflow: hidden;
}

.messages {
  padding: 18px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble {
  max-width: min(760px, 92%);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  line-height: 1.45;
  white-space: pre-wrap;
  font-size: 15px;
}

.bubble.user {
  margin-left: auto;
  background: var(--user);
  color: #ffffff;
}

.bubble.assistant {
  background: var(--assistant);
  color: #112423;
}

.bubble.note {
  background: #fff5e9;
  color: #6f4b21;
}

.composer {
  border-top: 1px solid var(--border);
  padding: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f5fbf9 100%);
}

.composer-label {
  font-size: 13px;
  color: var(--muted);
  display: block;
  margin-bottom: 6px;
}

textarea {
  width: 100%;
  resize: vertical;
  border-radius: 12px;
  border: 1px solid var(--border);
  padding: 12px;
  font-family: "Space Grotesk", sans-serif;
  font-size: 15px;
  color: var(--text);
  background: #ffffff;
}

textarea:focus {
  outline: 2px solid #0f8f7838;
  border-color: var(--accent);
}

.composer-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.composer-meta p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  font-family: "IBM Plex Mono", monospace;
}

.send-btn {
  border: 0;
  border-radius: 10px;
  background: var(--accent);
  color: var(--accent-ink);
  font-family: "Space Grotesk", sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 16px;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 980px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .sidebar {
    min-height: initial;
  }
}

@media (max-width: 640px) {
  .shell {
    padding: 16px;
  }

  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .topbar-actions {
    width: 100%;
    justify-content: space-between;
  }

  .messages {
    padding: 12px;
  }

  .bubble {
    max-width: 96%;
    font-size: 14px;
  }
}
`;

export const CHAT_UI_JS = `
const modelChip = document.getElementById("model-chip");
const threadListEl = document.getElementById("thread-list");
const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("composer-form");
const inputEl = document.getElementById("composer-input");
const sendBtn = document.getElementById("send-btn");
const newThreadBtn = document.getElementById("new-thread-btn");

const state = {
  threads: [],
  activeThreadId: null,
};

function createThread(title) {
  return {
    id: "t_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
    title: title || "New Thread",
    messages: [
      {
        role: "assistant",
        text: "Connected. I am ready for your Gemini Flash chat.",
      },
    ],
  };
}

function activeThread() {
  return state.threads.find((thread) => thread.id === state.activeThreadId);
}

function setActiveThread(threadId) {
  state.activeThreadId = threadId;
  render();
}

function addThread() {
  const thread = createThread();
  state.threads.unshift(thread);
  setActiveThread(thread.id);
}

function trimTitle(text) {
  return text.length > 28 ? text.slice(0, 28) + "..." : text;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderThreads() {
  threadListEl.innerHTML = "";
  state.threads.forEach((thread) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thread-item" + (thread.id === state.activeThreadId ? " active" : "");
    btn.textContent = trimTitle(thread.title);
    btn.addEventListener("click", () => setActiveThread(thread.id));
    threadListEl.appendChild(btn);
  });
}

function renderMessages() {
  const thread = activeThread();
  messagesEl.innerHTML = "";
  if (!thread) {
    return;
  }

  thread.messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = "bubble " + message.role;
    bubble.innerHTML = escapeHtml(message.text);
    messagesEl.appendChild(bubble);
  });

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function render() {
  renderThreads();
  renderMessages();
}

async function sendMessage() {
  const thread = activeThread();
  if (!thread) return;

  const message = inputEl.value.trim();
  if (!message) return;

  if (thread.title === "New Thread") {
    thread.title = message.slice(0, 48);
  }

  thread.messages.push({ role: "user", text: message });
  thread.messages.push({ role: "assistant", text: "Thinking..." });
  inputEl.value = "";
  sendBtn.disabled = true;
  render();

  const history = thread.messages
    .slice(0, -1)
    .filter((item) => item.role === "user" || item.role === "assistant")
    .map((item) => ({ role: item.role, text: item.text }));

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Chat request failed.");
    }

    if (payload.model) {
      modelChip.textContent = "Model: " + payload.model;
    }

    thread.messages[thread.messages.length - 1] = {
      role: "assistant",
      text: payload.reply,
    };
  } catch (error) {
    thread.messages[thread.messages.length - 1] = {
      role: "note",
      text: error instanceof Error ? error.message : "Request failed.",
    };
  } finally {
    sendBtn.disabled = false;
    render();
  }
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendMessage();
});

inputEl.addEventListener("keydown", async (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    await sendMessage();
  }
});

newThreadBtn.addEventListener("click", addThread);

document.querySelectorAll(".quick-prompt").forEach((button) => {
  button.addEventListener("click", () => {
    inputEl.value = button.getAttribute("data-prompt") || "";
    inputEl.focus();
  });
});

addThread();
render();
`;

