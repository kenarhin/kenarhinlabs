import type { AuthorizationRepository, ProfileStatus } from "@labs/auth";
import { dependencyUnavailable } from "@labs/core";
import { createWorkerDatabase, profiles, type WorkerDatabase } from "@labs/db";
import { findPublishedContent, listPublicNavigation } from "@labs/db/queries/content.queries";
import { listCurrentOffers } from "@labs/db/queries/offers.queries";
import { getUserAuthorization } from "@labs/db/queries/users.queries";

import type { JsonValue } from "../types/app";
import type { ApiServices } from "./contracts";
import { createUnavailableServices } from "./unavailable";

/** Narrows an unknown binding without duplicating Cloudflare's generated Env interface. */
function isHyperdriveBinding(value: unknown): value is Hyperdrive {
  return (
    typeof value === "object" &&
    value !== null &&
    "connectionString" in value &&
    typeof value.connectionString === "string" &&
    value.connectionString.length > 0
  );
}

/** Retrieves the generated Worker binding and fails closed when not provisioned. */
function hyperdrive(bindings: CloudflareBindings): Hyperdrive {
  if (!("HYPERDRIVE" in bindings) || !isHyperdriveBinding(bindings.HYPERDRIVE)) {
    throw dependencyUnavailable("Hyperdrive");
  }
  return bindings.HYPERDRIVE;
}

/** Runs one request-scoped database operation and always releases pg resources. */
async function withDatabase<T>(
  bindings: CloudflareBindings,
  operation: (database: WorkerDatabase) => Promise<T>,
): Promise<T> {
  const resource = createWorkerDatabase(hyperdrive(bindings));
  try {
    return await operation(resource.db);
  } finally {
    await resource.close();
  }
}

/** Converts database values such as Date and bigint into a JSON-safe response. */
function jsonSafe(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, jsonSafe(nestedValue)]),
    );
  }
  return null;
}

/** Validates the database status before adapting it to the auth package contract. */
function profileStatus(value: string): ProfileStatus {
  if (value === "active" || value === "invited" || value === "suspended" || value === "deleted") {
    return value;
  }
  throw dependencyUnavailable("Authorization data");
}

/** Creates the Postgres-backed authorization repository required by admin middleware. */
function createAuthorizationRepository(bindings: CloudflareBindings): AuthorizationRepository {
  return {
    findByUserId: async (userId) =>
      withDatabase(bindings, async (database) => {
        const result = await getUserAuthorization(database, userId);
        if (result === null) {
          return null;
        }
        return {
          permissions: result.permissions,
          profileStatus: profileStatus(result.profile.status),
          roles: result.roles,
          userId: result.profile.id,
        };
      }),
  };
}

/**
 * Creates request-scoped production services that can be implemented safely
 * with the database lane today, leaving unavailable adapters fail-closed.
 */
export function createWorkerServices(bindings: CloudflareBindings): ApiServices {
  const unavailable = createUnavailableServices();

  return {
    ...unavailable,
    authorizationRepository: createAuthorizationRepository(bindings),
    databaseProbe: {
      check: async () => {
        try {
          await withDatabase(bindings, async (database) => {
            await database.select({ id: profiles.id }).from(profiles).limit(1);
          });
          return { ok: true };
        } catch (error) {
          return {
            detail: error instanceof Error ? error.message.slice(0, 160) : "database check failed",
            ok: false,
          };
        }
      },
    },
    publicRead: {
      ...unavailable.publicRead,
      getContent: async (type, slug) =>
        withDatabase(bindings, async (database) => {
          const item = await findPublishedContent(database, type, slug);
          return item === null ? null : jsonSafe(item);
        }),
      getNavigation: async () =>
        withDatabase(bindings, async (database) => {
          const [header, footer] = await Promise.all([
            listPublicNavigation(database, "header"),
            listPublicNavigation(database, "footer"),
          ]);
          return jsonSafe({ footer, header });
        }),
      listOffers: async () =>
        withDatabase(bindings, async (database) => jsonSafe(await listCurrentOffers(database))),
    },
  };
}
