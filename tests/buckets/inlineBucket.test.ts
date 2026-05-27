import test from "node:test";
import assert from "node:assert/strict";
import { inlineBucket } from "src/buckets/inline/inlineBucket";

test("inlineBucket matches inline events", () => {
  assert.equal(
    inlineBucket.match({
      eventId: "e",
      updateId: 1,
      type: "inline_query",
      timestamp: 1,
      raw: { update_id: 1 },
    }),
    true
  );
});
