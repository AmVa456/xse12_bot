import { BucketDefinition } from "src/router/types";
import { loggingPipe } from "src/pipes/common/loggingPipe";
import { authPipe } from "src/pipes/common/authPipe";
import { commandPipe } from "src/pipes/common/commandPipe";
import { mediaBridgePipe } from "src/pipes/common/mediaBridgePipe";
import { dmConversationPipe } from "src/pipes/dm/dmConversationPipe";
import { dmFallbackPipe } from "src/pipes/dm/dmFallbackPipe";

export const dmBucket: BucketDefinition = {
  name: "dm",
  match(event) {
    return event.type === "dm_message";
  },
  pipes: [loggingPipe, authPipe, commandPipe, mediaBridgePipe, dmConversationPipe, dmFallbackPipe],
};

