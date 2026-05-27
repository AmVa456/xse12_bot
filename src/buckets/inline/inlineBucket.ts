import { BucketDefinition } from "src/router/types";
import { loggingPipe } from "src/pipes/common/loggingPipe";
import { inlineAuthPipe } from "src/pipes/inline/inlineAuthPipe";
import { inlineRouterPipe } from "src/pipes/inline/inlineRouterPipe";
import { inlineResponsePipe } from "src/pipes/inline/inlineResponsePipe";

export const inlineBucket: BucketDefinition = {
  name: "inline",
  match(event) {
    return event.type === "inline_query";
  },
  pipes: [loggingPipe, inlineAuthPipe, inlineRouterPipe, inlineResponsePipe],
};

