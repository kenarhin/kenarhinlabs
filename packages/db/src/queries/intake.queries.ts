import { emailMessages, emailThreads, leads, outboxEvents } from "../schema/index.js";
import type { WorkerDatabase } from "../client/worker.js";

/**
 * Describes every canonical record that must commit before public intake is accepted.
 * Queue publication is intentionally excluded because the transactional outbox owns recovery.
 */
export interface IntakeTransactionPlan {
  lead?: typeof leads.$inferInsert;
  thread?: typeof emailThreads.$inferInsert;
  messages?: readonly (typeof emailMessages.$inferInsert)[];
  outboxEvents?: readonly (typeof outboxEvents.$inferInsert)[];
}

/**
 * Persists one lead and its durable notification work in a single Postgres transaction.
 *
 * @param database - Request-scoped Drizzle client backed by Hyperdrive.
 * @param plan - Fully validated canonical records with stable application-generated IDs.
 * @returns A promise that resolves only after the complete intake unit commits.
 */
export async function persistIntakeTransaction(
  database: WorkerDatabase,
  plan: IntakeTransactionPlan,
): Promise<void> {
  await database.transaction(async (transaction) => {
    if (plan.lead !== undefined) await transaction.insert(leads).values(plan.lead);
    if (plan.thread !== undefined) await transaction.insert(emailThreads).values(plan.thread);
    if (plan.messages !== undefined && plan.messages.length > 0) {
      await transaction.insert(emailMessages).values([...plan.messages]);
    }
    if (plan.outboxEvents !== undefined && plan.outboxEvents.length > 0) {
      await transaction.insert(outboxEvents).values([...plan.outboxEvents]);
    }
  });
}
