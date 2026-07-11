import { describe, expect, it, vi } from "vitest";

import {
  D1ProjectionWriter,
  ProjectionRegistry,
  createDefaultProjectionRegistry,
  consumeProjectionBatch,
  type OutboxEvent,
} from "../src";

const event: OutboxEvent = {
  id: "event-1",
  eventType: "content.published.v1",
  aggregateType: "content_item",
  aggregateId: "content-1",
  payload: { title: "Hello" },
  syncVersion: 4,
  createdAt: "2026-07-10T00:00:00.000Z",
};

/**
 * Creates a minimal D1 binding that records prepared SQL and batch order.
 *
 * @param receiptChanges - Change count returned by the receipt statement.
 * @returns Mock D1 database and captured SQL list.
 */
function createDatabase(receiptChanges: number): {
  database: D1Database;
  sql: string[];
} {
  const sql: string[] = [];
  const createStatement = (): D1PreparedStatement => ({
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    run: vi.fn().mockResolvedValue({ success: true, results: [], meta: {} }),
    all: vi.fn().mockResolvedValue({ success: true, results: [], meta: {} }),
    raw: vi.fn().mockResolvedValue([]),
  });
  const session: D1DatabaseSession = {
    prepare: vi.fn().mockImplementation(() => createStatement()),
    batch: vi.fn().mockResolvedValue([]),
    getBookmark: vi.fn().mockReturnValue(null),
  };
  const database: D1Database = {
    prepare(query: string) {
      sql.push(query);
      return createStatement();
    },
    batch: vi.fn().mockImplementation(async (statements: unknown[]) =>
      statements.map((_, index) => ({
        success: true,
        results: [],
        meta: { changes: index === statements.length - 1 ? receiptChanges : 1 },
      })),
    ),
    exec: vi.fn().mockResolvedValue({ count: 0, duration: 0 }),
    withSession: vi.fn().mockReturnValue(session),
    dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  };
  return { database, sql };
}

describe("D1ProjectionWriter", () => {
  it("batches a watermark-guarded upsert before its projection receipt", async () => {
    const { database, sql } = createDatabase(1);
    const result = await new D1ProjectionWriter(database).apply(event, [
      {
        action: "upsert",
        projection: "public_content",
        table: "public_content",
        keyColumn: "id",
        keyValue: "content-1",
        values: { title: "Hello", sync_version: 4 },
      },
    ]);

    expect(result).toBe("applied");
    expect(sql[0]).toContain("projection_receipts");
    expect(sql[0]).toContain("sync_version");
    expect(sql[1]).toContain('INSERT INTO "projection_receipts"');
  });

  it("reports an existing receipt as already applied", async () => {
    const { database } = createDatabase(0);
    const result = await new D1ProjectionWriter(database).apply(event, [
      {
        action: "delete",
        projection: "public_content",
        table: "public_content",
        keyColumn: "id",
        keyValue: "content-1",
      },
    ]);

    expect(result).toBe("already-applied");
  });
});

describe("default projectors", () => {
  it("allowlists public fields and derives sync_version from the outbox", () => {
    const registry = createDefaultProjectionRegistry();
    const [mutation] = registry.project({
      ...event,
      payload: {
        id: "content-1",
        type: "post",
        slug: "hello",
        title: "Hello",
        body_html: "<p>Hello</p>",
        author_name: "Ada",
        published_at: event.createdAt,
        updated_at: event.createdAt,
        private_notes: "must not leak",
      },
    });

    expect(mutation?.action).toBe("upsert");
    if (mutation?.action !== "upsert") {
      throw new Error("Expected an upsert mutation.");
    }
    expect(mutation.values.sync_version).toBe(4);
    expect(mutation.values).not.toHaveProperty("private_notes");
  });
});

describe("consumeProjectionBatch", () => {
  it("retries only the message whose D1 operation fails", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const { database } = createDatabase(1);
    database.batch = vi.fn().mockRejectedValue(new Error("D1 unavailable"));
    const source = {
      load: vi.fn().mockResolvedValue(event),
      markProcessed: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };
    const registry = new ProjectionRegistry().register(event.eventType, () => ({
      action: "delete",
      projection: "public_content",
      table: "public_content",
      keyColumn: "id",
      keyValue: event.aggregateId,
    }));
    const batch = {
      queue: "content-sync",
      metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
      messages: [
        {
          id: "queue-1",
          timestamp: new Date(),
          attempts: 2,
          body: {
            schemaVersion: 1,
            eventId: event.id,
            enqueuedAt: event.createdAt,
          },
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } satisfies MessageBatch<unknown>;

    await consumeProjectionBatch(batch, {
      source,
      registry,
      writer: new D1ProjectionWriter(database),
    });

    expect(retry).toHaveBeenCalledWith({ delaySeconds: 30 });
    expect(ack).not.toHaveBeenCalled();
    expect(source.markFailed).toHaveBeenCalledOnce();
  });
});
