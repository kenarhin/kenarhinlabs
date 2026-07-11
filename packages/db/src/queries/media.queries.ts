import { and, eq, isNull } from "drizzle-orm";

import type { NodeDatabase } from "../client/node.js";
import { assets } from "../schema/media.js";

/** Resolves one non-deleted R2 object by its stable bucket/key pair. */
export async function findAssetByObjectKey(db: NodeDatabase, bucket: string, objectKey: string) {
  const [asset] = await db
    .select()
    .from(assets)
    .where(
      and(eq(assets.bucket, bucket), eq(assets.objectKey, objectKey), isNull(assets.deletedAt)),
    )
    .limit(1);

  return asset ?? null;
}
