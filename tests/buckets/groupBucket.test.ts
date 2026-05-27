import test from "node:test";
import assert from "node:assert/strict";
import { groupBucket } from "src/buckets/group/groupBucket";

test("groupBucket matches group events", () => {
  assert.equal(
    groupBucket.match({
      eventId: "e",
      updateId: 1,
      type: "group_message",
      timestamp: 1,
      raw: { update_id: 1 },
    }),
    true
  );
});
