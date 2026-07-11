import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";

import type { NodeDatabase } from "../client/node.js";
import { offers, tools } from "../schema/commerce.js";

/** Lists active offers inside their validity window with optional tool metadata. */
export function listCurrentOffers(db: NodeDatabase, now = new Date()) {
  return db
    .select({ offer: offers, tool: tools })
    .from(offers)
    .leftJoin(tools, eq(offers.toolId, tools.id))
    .where(
      and(
        eq(offers.status, "active"),
        or(isNull(offers.startsAt), lte(offers.startsAt, now)),
        or(isNull(offers.endsAt), gt(offers.endsAt, now)),
      ),
    )
    .orderBy(asc(offers.endsAt), asc(offers.title));
}
