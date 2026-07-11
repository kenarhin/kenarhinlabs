import { describe, expect, it, vi } from "vitest";

import {
  R2Storage,
  assertValidObjectKey,
  buildPublicObjectUrl,
  consumeMediaBatch,
  createStorageObjectResponse,
} from "../src";

/**
 * Creates a minimal R2 metadata object for adapter tests.
 *
 * @param key - Object key represented by the mock.
 * @returns An R2 metadata object with deterministic values.
 */
function createR2Object(key: string): R2Object {
  return {
    key,
    version: "v1",
    size: 5,
    etag: "abc",
    httpEtag: '"abc"',
    checksums: { toJSON: () => ({}) },
    uploaded: new Date("2026-07-10T00:00:00.000Z"),
    storageClass: "Standard",
    writeHttpMetadata: () => undefined,
    httpMetadata: { contentType: "text/plain" },
  };
}

/**
 * Builds a complete structural R2 binding with overridable operations.
 *
 * @param overrides - R2 methods replaced for a specific test.
 * @returns A binding-compatible in-memory mock.
 */
function createR2Bucket(
  overrides: {
    get?: R2Bucket["get"];
    put?: R2Bucket["put"];
  } = {},
): R2Bucket {
  return {
    head: vi.fn().mockResolvedValue(null),
    get: overrides.get ?? vi.fn().mockResolvedValue(null),
    put: overrides.put ?? vi.fn().mockResolvedValue(createR2Object("default")),
    createMultipartUpload: vi.fn().mockRejectedValue(new Error("Not implemented")),
    resumeMultipartUpload: vi.fn().mockReturnValue({
      key: "default",
      uploadId: "upload-1",
      uploadPart: vi.fn().mockRejectedValue(new Error("Not implemented")),
      abort: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockRejectedValue(new Error("Not implemented")),
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue({ objects: [], delimitedPrefixes: [], truncated: false }),
  };
}

describe("R2Storage", () => {
  it("rejects traversal-like and absolute keys", () => {
    expect(() => assertValidObjectKey("../secret")).toThrow(TypeError);
    expect(() => assertValidObjectKey("/absolute")).toThrow(TypeError);
  });

  it("encodes each public URL path segment", () => {
    expect(
      buildPublicObjectUrl("https://media.example.com/assets", "case studies/a b.png").href,
    ).toBe("https://media.example.com/assets/case%20studies/a%20b.png");
  });

  it("streams an R2 body and preserves the quoted HTTP etag", async () => {
    const metadata = createR2Object("notes/hello.txt");
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("hello"));
        controller.close();
      },
    });
    const bucket = createR2Bucket({
      get: vi.fn().mockResolvedValue({ ...metadata, body, bodyUsed: false }),
    });
    const result = await new R2Storage(bucket).get("notes/hello.txt");

    expect(result.kind).toBe("found");
    if (result.kind !== "found") {
      throw new Error("Expected a successful R2 read.");
    }

    const response = createStorageObjectResponse(result);
    expect(response.headers.get("etag")).toBe('"abc"');
    expect(await response.text()).toBe("hello");
  });

  it("returns null when a conditional put is rejected", async () => {
    const bucket = createR2Bucket({ put: vi.fn().mockResolvedValue(null) });
    const result = await new R2Storage(bucket).put({
      key: "uploads/photo.png",
      body: new Uint8Array([1, 2, 3]),
      onlyIf: { etagDoesNotMatch: "*" },
    });

    expect(result).toBeNull();
  });

  it("reports a metadata-only conditional read as a failed precondition", async () => {
    const bucket = createR2Bucket({
      get: vi.fn().mockResolvedValue(createR2Object("notes/hello.txt")),
    });

    const result = await new R2Storage(bucket).get("notes/hello.txt", {
      onlyIf: { etagMatches: '"different"' },
    });

    expect(result.kind).toBe("precondition-failed");
  });

  it("emits a complete HTTP byte-range response", async () => {
    const metadata = createR2Object("notes/hello.txt");
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("ell"));
        controller.close();
      },
    });
    const bucket = createR2Bucket({
      get: vi.fn().mockResolvedValue({
        ...metadata,
        body,
        bodyUsed: false,
        range: { offset: 1, length: 3 },
      }),
    });
    const result = await new R2Storage(bucket).get("notes/hello.txt", {
      range: { offset: 1, length: 3 },
    });

    if (result.kind !== "found") {
      throw new Error("Expected a ranged R2 read.");
    }
    const response = createStorageObjectResponse(result);
    expect(response.status).toBe(206);
    expect(response.headers.get("content-length")).toBe("3");
    expect(response.headers.get("content-range")).toBe("bytes 1-3/5");
  });

  it("rejects delete batches above the native R2 limit", async () => {
    const bucket = createR2Bucket();
    const keys = Array.from({ length: 1_001 }, (_, index) => `objects/${index}`);

    await expect(new R2Storage(bucket).delete(keys)).rejects.toThrow(RangeError);
  });
});

describe("media queue", () => {
  it("retries only a failed media job", async () => {
    const ack = vi.fn();
    const retry = vi.fn();
    const batch = {
      queue: "media",
      metadata: { metrics: { backlogCount: 0, backlogBytes: 0 } },
      messages: [
        {
          id: "queue-media-1",
          timestamp: new Date(),
          attempts: 1,
          body: {
            schemaVersion: 1,
            jobId: "media-1",
            assetId: "asset-1",
            objectKey: "uploads/photo.png",
            operation: "inspect",
            enqueuedAt: "2026-07-10T00:00:00.000Z",
          },
          ack,
          retry,
        },
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn(),
    } satisfies MessageBatch<unknown>;

    await consumeMediaBatch(batch, {
      process: vi.fn().mockRejectedValue(new Error("scanner unavailable")),
    });

    expect(retry).toHaveBeenCalledWith({ delaySeconds: 30 });
    expect(ack).not.toHaveBeenCalled();
  });
});
