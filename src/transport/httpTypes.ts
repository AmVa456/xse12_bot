import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

export type HttpRequest = IncomingMessage & {
  bodyText?: string;
};

export type HttpResponse = ServerResponse;

export type RequestHeaders = IncomingHttpHeaders;
