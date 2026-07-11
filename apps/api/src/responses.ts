import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { AppContext, JsonValue } from "./types/app";

/** Returns the canonical success envelope with the current request identifier. */
export function success(
  context: AppContext,
  data: JsonValue,
  status: ContentfulStatusCode = 200,
): Response {
  return context.json(
    {
      data,
      ok: true as const,
      requestId: context.get("requestId"),
    },
    status,
  );
}
