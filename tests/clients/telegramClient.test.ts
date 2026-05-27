import test from "node:test";
import assert from "node:assert/strict";
import { createTelegramClient, TelegramApiError } from "src/clients/telegram/telegramClient";

test("telegram client throws for missing token", () => {
  assert.throws(() => createTelegramClient(""));
});

test("telegram client surfaces api errors", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    ({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, description: "fail" }),
    } as Response)) as typeof fetch;

  const client = createTelegramClient("token");
  await assert.rejects(async () => client.setWebhook({ url: "https://example.com" }), TelegramApiError);

  global.fetch = originalFetch;
});

test("telegram client supports getMe and setMyCommands", async () => {
  const originalFetch = global.fetch;
  const called: string[] = [];

  global.fetch = (async (input) => {
    const url = String(input);
    called.push(url);
    if (url.endsWith("/getMe")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, result: { id: 123, is_bot: true, first_name: "xser12" } }),
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: true }),
    } as Response;
  }) as typeof fetch;

  const client = createTelegramClient("token");
  const me = await client.getMe();
  await client.setMyCommands({
    commands: [{ command: "start", description: "Start bot." }],
  });

  assert.equal(me.id, 123);
  assert.equal(called.some((url) => url.endsWith("/getMe")), true);
  assert.equal(called.some((url) => url.endsWith("/setMyCommands")), true);

  global.fetch = originalFetch;
});
