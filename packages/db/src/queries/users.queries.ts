import { eq } from "drizzle-orm";

import type { NodeDatabase } from "../client/node.js";
import { permissions, profiles, rolePermissions, roles, userRoles } from "../schema/app.js";

/** Loads a profile with de-duplicated role and permission keys for authorization. */
export async function getUserAuthorization(db: NodeDatabase, userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  if (!profile) return null;

  const grants = await db
    .select({ role: roles.key, permission: permissions.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  return {
    profile,
    roles: [...new Set(grants.map((grant) => grant.role))],
    permissions: [
      ...new Set(grants.flatMap((grant) => (grant.permission ? [grant.permission] : []))),
    ],
  };
}
