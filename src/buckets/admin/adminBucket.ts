import { BucketDefinition } from "src/router/types";
import { loggingPipe } from "src/pipes/common/loggingPipe";
import { authPipe } from "src/pipes/common/authPipe";
import { commandPipe } from "src/pipes/common/commandPipe";

export const adminBucket: BucketDefinition = {
  name: "admin",
  match(event) {
    return event.type === "dm_message" && (event.text || "").startsWith("/admin");
  },
  pipes: [loggingPipe, authPipe, commandPipe],
};

