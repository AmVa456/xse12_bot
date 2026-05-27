import test from "node:test";
import assert from "node:assert/strict";
import { dmBucket } from "src/buckets/dm/dmBucket";

test("dmBucket matches private events", () => {
  assert.equal(
    dmBucket.match({
      eventId: "e",
      updateId: 1,
      type: "dm_message",
      timestamp: 1,
      raw: { update_id: 1 },
    }),
    true
  );
});
