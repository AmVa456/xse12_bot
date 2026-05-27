import { BucketDefinition } from "src/router/types";
import { loggingPipe } from "src/pipes/common/loggingPipe";
import { mediaBridgePipe } from "src/pipes/common/mediaBridgePipe";
import { groupConfigPipe } from "src/pipes/group/groupConfigPipe";
import { mentionPipe } from "src/pipes/group/mentionPipe";
import { moderationPipe } from "src/pipes/group/moderationPipe";
import { groupAnalyticsPipe } from "src/pipes/group/groupAnalyticsPipe";

export const groupBucket: BucketDefinition = {
  name: "group",
  match(event) {
    return event.type === "group_message";
  },
  pipes: [loggingPipe, mediaBridgePipe, groupConfigPipe, mentionPipe, moderationPipe, groupAnalyticsPipe],
};

