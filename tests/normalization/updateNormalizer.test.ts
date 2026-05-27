import test from "node:test";
import assert from "node:assert/strict";
import { normalizeUpdate } from "src/normalization/updateNormalizer";

test("normalizes DM message update", () => {
  const event = normalizeUpdate({
    update_id: 1,
    message: {
      message_id: 10,
      date: 123,
      chat: { id: 5, type: "private" },
      from: { id: 22, is_bot: false, first_name: "A" },
      text: "hi",
    },
  });

  assert.equal(event.type, "dm_message");
  assert.equal(event.chatId, 5);
  assert.equal(event.userId, 22);
  assert.equal(event.text, "hi");
});

test("normalizes inline query", () => {
  const event = normalizeUpdate({
    update_id: 2,
    inline_query: {
      id: "iq1",
      from: { id: 33, is_bot: false, first_name: "B" },
      query: "echo hi",
      offset: "",
    },
  });

  assert.equal(event.type, "inline_query");
  assert.equal(event.inlineQueryId, "iq1");
  assert.equal(event.userId, 33);
});

test("normalizes system event", () => {
  const event = normalizeUpdate({
    update_id: 3,
    my_chat_member: {
      chat: { id: 10, type: "group" },
      from: { id: 1, is_bot: false, first_name: "U" },
      date: 999,
    },
  });

  assert.equal(event.type, "system_event");
});
