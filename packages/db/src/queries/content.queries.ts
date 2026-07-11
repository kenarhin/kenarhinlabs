import { and, desc, eq, isNull, lte } from "drizzle-orm";

import type { NodeDatabase } from "../client/node.js";
import { contentItems, navigationItems } from "../schema/content.js";

/** Returns one currently published canonical content item for fallback reads. */
export async function findPublishedContent(db: NodeDatabase, type: string, slug: string) {
  const [item] = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.type, type),
        eq(contentItems.slug, slug),
        eq(contentItems.status, "published"),
        isNull(contentItems.deletedAt),
        lte(contentItems.publishedAt, new Date()),
      ),
    )
    .limit(1);

  return item ?? null;
}

/** Returns active navigation in deterministic tree-display order. */
export function listPublicNavigation(db: NodeDatabase, location: string) {
  return db
    .select()
    .from(navigationItems)
    .where(and(eq(navigationItems.location, location), eq(navigationItems.isActive, true)))
    .orderBy(navigationItems.sortOrder, navigationItems.label);
}

/** Returns recent published content for projection rebuilds and API fallback. */
export function listPublishedContent(db: NodeDatabase, type: string, limit = 50) {
  return db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.type, type),
        eq(contentItems.status, "published"),
        isNull(contentItems.deletedAt),
      ),
    )
    .orderBy(desc(contentItems.publishedAt))
    .limit(limit);
}
