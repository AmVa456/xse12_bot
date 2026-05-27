import { BucketDefinition } from "src/router/types";
import { adminBucket } from "src/buckets/admin/adminBucket";
import { dmBucket } from "src/buckets/dm/dmBucket";
import { groupBucket } from "src/buckets/group/groupBucket";
import { inlineBucket } from "src/buckets/inline/inlineBucket";
import { systemBucket } from "src/buckets/system/systemBucket";
import { TgEvent } from "src/normalization/eventTypes";

const BUCKETS: BucketDefinition[] = [adminBucket, inlineBucket, groupBucket, dmBucket, systemBucket];

export function getBucketForEvent(event: TgEvent): BucketDefinition {
  const match = BUCKETS.find((bucket) => bucket.match(event));
  return match || systemBucket;
}

export function getAllBuckets(): BucketDefinition[] {
  return BUCKETS;
}

