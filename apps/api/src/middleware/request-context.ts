import { requestId } from "hono/request-id";
import type { MiddlewareHandler } from "hono";

import { parseRuntimeEnv } from "../env";
import type { AppEnv } from "../types/app";

/** Creates trusted request IDs and validates runtime bindings once per request. */
export const requestContextMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const assignRequestId = requestId({
    generator: (requestContext) =>
      requestContext.req.header("cf-ray")?.slice(0, 64) ?? crypto.randomUUID(),
    headerName: "",
    limitLength: 64,
  });

  return assignRequestId(context, async () => {
    context.set("runtimeEnv", parseRuntimeEnv(context.env));
    await next();
    context.header("x-request-id", context.get("requestId"));
  });
};
