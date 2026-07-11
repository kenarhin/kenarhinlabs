import {
  authorizePrincipal,
  extractBearerToken,
  resolvePrincipal,
  verifySupabaseJwt,
} from "@labs/auth";
import type { Permission } from "@labs/core";
import type { MiddlewareHandler } from "hono";

import type { ApiServices } from "../services/contracts";
import type { AppEnv } from "../types/app";

/** Verifies Supabase identity and resolves current Postgres RBAC assignments. */
export function createAuthenticationMiddleware(services: ApiServices): MiddlewareHandler<AppEnv> {
  return async (context, next) => {
    const runtimeEnv = context.get("runtimeEnv");
    const token = extractBearerToken(context.req.header("authorization"));
    const identity = await verifySupabaseJwt(token, {
      audience: runtimeEnv.SUPABASE_JWT_AUDIENCE,
      supabaseUrl: runtimeEnv.SUPABASE_URL,
    });
    const principal = await resolvePrincipal(identity, services.authorizationRepository);

    context.set("principal", principal);
    await next();
  };
}

/** Enforces one capability after the authentication middleware resolves RBAC. */
export function requireRoutePermission(permission: Permission): MiddlewareHandler<AppEnv> {
  return async (context, next) => {
    authorizePrincipal(context.get("principal"), permission);
    await next();
  };
}
