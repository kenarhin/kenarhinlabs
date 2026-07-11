import { forbidden, requirePermission, type Permission } from "@labs/core";

import type { AuthIdentity } from "./supabase-jwt";

export type ProfileStatus = "active" | "invited" | "suspended" | "deleted";

export interface UserAuthorizationRecord {
  userId: string;
  profileStatus: ProfileStatus;
  roles: readonly string[];
  permissions: readonly string[];
}

/**
 * Persistence port for the app.profiles -> user_roles -> role_permissions
 * query. The database package supplies the production implementation.
 */
export interface AuthorizationRepository {
  findByUserId(userId: string): Promise<UserAuthorizationRecord | null>;
}

export interface AuthorizedPrincipal {
  identity: AuthIdentity;
  roles: ReadonlySet<string>;
  permissions: ReadonlySet<string>;
}

/** Resolves current database assignments so stale JWT claims never grant RBAC access. */
export async function resolvePrincipal(
  identity: AuthIdentity,
  repository: AuthorizationRepository,
): Promise<AuthorizedPrincipal> {
  const authorization = await repository.findByUserId(identity.sub);

  if (
    authorization === null ||
    authorization.userId !== identity.sub ||
    authorization.profileStatus !== "active"
  ) {
    throw forbidden("This account is not permitted to access the administration API");
  }

  return {
    identity,
    roles: new Set(authorization.roles),
    permissions: new Set(authorization.permissions),
  };
}

/** Enforces a route capability against permissions resolved from Postgres. */
export function authorizePrincipal(principal: AuthorizedPrincipal, permission: Permission): void {
  requirePermission(principal.permissions, permission);
}
