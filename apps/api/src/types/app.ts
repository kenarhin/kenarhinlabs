import type { AuthorizedPrincipal } from "@labs/auth";
import type { Context } from "hono";

import type { RuntimeEnv } from "../env";

export interface AppVariables {
  principal: AuthorizedPrincipal;
  requestId: string;
  runtimeEnv: RuntimeEnv;
}

export interface AppEnv {
  Bindings: CloudflareBindings;
  Variables: AppVariables;
}

export type AppContext = Context<AppEnv>;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

/** Represents a recursively JSON-serializable object without unsafe `any` values. */
export interface JsonObject {
  [key: string]: JsonValue;
}
