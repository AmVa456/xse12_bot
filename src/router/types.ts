import { TelegramClient } from "src/clients/telegram/telegramClient";
import { TgEvent } from "src/normalization/eventTypes";
import { DbClient } from "src/state/dbClient";
import { RedisClient } from "src/state/redisClient";
import { ChatState, OutboundOperation, RouteMutations, SessionState, UserState } from "src/state/models";
import { AppConfig } from "src/utils/config";
import { Logger } from "src/utils/logger";

export type RouteContext = {
  event: TgEvent;
  config: AppConfig;
  logger: Logger;
  db: DbClient;
  redis?: RedisClient;
  tg: TelegramClient;
  userState?: UserState;
  chatState?: ChatState;
  sessionState?: SessionState;
  mutations: RouteMutations;
  meta: {
    command?: string;
    pillar?: string;
    action?: string;
    payload?: string;
    isAdmin?: boolean;
    mentionMatched?: boolean;
    inlineMode?: string;
  };
};

export type Pipe = (ctx: RouteContext) => Promise<void>;

export type BucketDefinition = {
  name: string;
  match(event: TgEvent): boolean;
  pipes: Pipe[];
};

export type RouterDependencies = {
  config: AppConfig;
  logger: Logger;
  db: DbClient;
  redis?: RedisClient;
  tg: TelegramClient;
};

export function createBaseContext(event: TgEvent, deps: RouterDependencies): RouteContext {
  return {
    event,
    config: deps.config,
    logger: deps.logger,
    db: deps.db,
    redis: deps.redis,
    tg: deps.tg,
    mutations: {
      outbound: [],
    },
    meta: {},
  };
}

export function pushOutbound(ctx: RouteContext, op: OutboundOperation): void {
  ctx.mutations.outbound.push(op);
}
