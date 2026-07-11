import { NonRetryableProjectionError, ProjectionRegistry } from "./registry";
import type { OutboxEvent, ProjectionMutation, ProjectionValue } from "./types";

interface PublicProjectionDefinition {
  projection: string;
  table: string;
  keyColumn: string;
  fields: readonly string[];
  requiredFields: readonly string[];
}

/**
 * Reads a JSON object payload or fails permanently before public projection.
 *
 * @param event - Canonical outbox event.
 * @returns Payload record safe for field-by-field allowlisting.
 */
function payloadRecord(event: OutboxEvent): Record<string, unknown> {
  if (typeof event.payload !== "object" || event.payload === null || Array.isArray(event.payload)) {
    throw new NonRetryableProjectionError(`${event.eventType} requires an object payload.`);
  }
  return event.payload as Record<string, unknown>;
}

/**
 * Converts one allowlisted payload value into a D1 bind primitive.
 *
 * @param field - Public read-model field name used for diagnostics.
 * @param value - Canonical event payload value.
 * @returns D1-compatible primitive.
 */
function projectionValue(field: string, value: unknown): ProjectionValue {
  if (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    value instanceof ArrayBuffer
  ) {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "object" && value !== undefined) {
    return JSON.stringify(value);
  }
  throw new NonRetryableProjectionError(`Public projection field ${field} is not serializable.`);
}

/**
 * Builds a strict allowlist-based upsert projector for one public D1 table.
 *
 * @param definition - Public table, key, field, and required-field contract.
 * @returns Pure projector that drops all non-public payload fields.
 */
function upsertProjector(definition: PublicProjectionDefinition) {
  return (event: OutboxEvent): ProjectionMutation => {
    const payload = payloadRecord(event);
    for (const field of definition.requiredFields) {
      if (payload[field] === undefined || payload[field] === null) {
        throw new NonRetryableProjectionError(
          `${event.eventType} is missing required public field ${field}.`,
        );
      }
    }

    const keyValue = projectionValue(
      definition.keyColumn,
      payload[definition.keyColumn] ?? event.aggregateId,
    );
    const values: Record<string, ProjectionValue> = {};
    for (const field of definition.fields) {
      if (field === definition.keyColumn || field === "sync_version") {
        continue;
      }
      const value = payload[field];
      if (value !== undefined) {
        values[field] = projectionValue(field, value);
      }
    }
    values.sync_version = event.syncVersion;

    return {
      action: "upsert",
      projection: definition.projection,
      table: definition.table,
      keyColumn: definition.keyColumn,
      keyValue,
      values,
    };
  };
}

/**
 * Builds a delete projector that removes one aggregate from a public D1 table.
 *
 * @param definition - Public table and key contract.
 * @returns Pure delete projector.
 */
function deleteProjector(definition: PublicProjectionDefinition) {
  return (event: OutboxEvent): ProjectionMutation => {
    const payload = payloadRecord(event);
    return {
      action: "delete",
      projection: definition.projection,
      table: definition.table,
      keyColumn: definition.keyColumn,
      keyValue: projectionValue(
        definition.keyColumn,
        payload[definition.keyColumn] ?? event.aggregateId,
      ),
    };
  };
}

const DEFINITIONS = {
  content: {
    projection: "public_content",
    table: "public_content",
    keyColumn: "id",
    fields: [
      "id",
      "type",
      "slug",
      "title",
      "excerpt",
      "body_html",
      "cover_url",
      "author_name",
      "seo_title",
      "seo_description",
      "published_at",
      "updated_at",
      "sync_version",
    ],
    requiredFields: [
      "type",
      "slug",
      "title",
      "body_html",
      "author_name",
      "published_at",
      "updated_at",
    ],
  },
  tool: {
    projection: "public_tools",
    table: "public_tools",
    keyColumn: "id",
    fields: [
      "id",
      "slug",
      "name",
      "vendor_name",
      "category",
      "description",
      "website_url",
      "logo_url",
      "is_recommended",
      "setup_difficulty",
      "metadata_json",
      "updated_at",
      "sync_version",
    ],
    requiredFields: [
      "slug",
      "name",
      "category",
      "is_recommended",
      "setup_difficulty",
      "metadata_json",
      "updated_at",
    ],
  },
  offer: {
    projection: "public_offers",
    table: "public_offers",
    keyColumn: "id",
    fields: [
      "id",
      "tool_id",
      "slug",
      "title",
      "description",
      "offer_type",
      "code",
      "starts_at",
      "ends_at",
      "terms",
      "affiliate_url",
      "updated_at",
      "sync_version",
    ],
    requiredFields: ["slug", "title", "offer_type", "updated_at"],
  },
  navigation: {
    projection: "public_navigation",
    table: "public_navigation",
    keyColumn: "id",
    fields: ["id", "location", "label", "href", "parent_id", "sort_order", "sync_version"],
    requiredFields: ["location", "label", "href", "sort_order"],
  },
  homepage: {
    projection: "public_homepage_sections",
    table: "public_homepage_sections",
    keyColumn: "id",
    fields: [
      "id",
      "section_key",
      "section_type",
      "data_json",
      "sort_order",
      "updated_at",
      "sync_version",
    ],
    requiredFields: ["section_key", "section_type", "data_json", "sort_order", "updated_at"],
  },
  sitemap: {
    projection: "public_sitemap_urls",
    table: "public_sitemap_urls",
    keyColumn: "url",
    fields: ["url", "last_modified", "change_frequency", "priority_basis_points", "sync_version"],
    requiredFields: ["url"],
  },
  redirect: {
    projection: "public_redirects",
    table: "public_redirects",
    keyColumn: "source_path",
    fields: ["source_path", "target_path", "status_code", "sync_version"],
    requiredFields: ["source_path", "target_path", "status_code"],
  },
  seo: {
    projection: "public_seo_metadata",
    table: "public_seo_metadata",
    keyColumn: "path",
    fields: [
      "path",
      "title",
      "description",
      "canonical_url",
      "og_image_url",
      "robots",
      "structured_data_json",
      "updated_at",
      "sync_version",
    ],
    requiredFields: ["path", "updated_at"],
  },
} as const satisfies Record<string, PublicProjectionDefinition>;

/**
 * Creates the default registry for public, non-sensitive read-model events.
 *
 * @returns Registry covering content, commerce, navigation, homepage, sitemap,
 * redirects, and SEO projection events.
 */
export function createDefaultProjectionRegistry(): ProjectionRegistry {
  const registry = new ProjectionRegistry();
  const mappings: readonly [PublicProjectionDefinition, readonly string[], readonly string[]][] = [
    [
      DEFINITIONS.content,
      ["content.published", "content.updated"],
      ["content.unpublished", "content.archived", "content.deleted"],
    ],
    [DEFINITIONS.tool, ["tool.published", "tool.updated"], ["tool.unpublished", "tool.deleted"]],
    [
      DEFINITIONS.offer,
      ["offer.published", "offer.updated"],
      ["offer.unpublished", "offer.expired", "offer.deleted"],
    ],
    [DEFINITIONS.navigation, ["navigation.updated"], ["navigation.deleted"]],
    [DEFINITIONS.homepage, ["homepage.updated"], ["homepage.deleted"]],
    [DEFINITIONS.sitemap, ["sitemap.updated"], ["sitemap.deleted"]],
    [DEFINITIONS.redirect, ["redirect.updated"], ["redirect.deleted"]],
    [DEFINITIONS.seo, ["seo.updated"], ["seo.deleted"]],
  ];

  for (const [definition, upsertEvents, deleteEvents] of mappings) {
    for (const eventType of upsertEvents) {
      registry.register(eventType, upsertProjector(definition));
      registry.register(`${eventType}.v1`, upsertProjector(definition));
    }
    for (const eventType of deleteEvents) {
      registry.register(eventType, deleteProjector(definition));
      registry.register(`${eventType}.v1`, deleteProjector(definition));
    }
  }
  return registry;
}
