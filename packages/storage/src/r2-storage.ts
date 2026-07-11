import { assertValidObjectKey } from "./keys";
import type {
  GetStorageObjectOptions,
  GetStorageObjectResult,
  PutStorageObjectInput,
  StorageObjectMetadata,
  StorageResponseOptions,
} from "./types";

/**
 * Maps native R2 metadata into the stable storage-package contract.
 *
 * @param object - Metadata returned by the R2 binding.
 * @returns Framework-independent object metadata.
 */
function toStorageMetadata(object: R2Object): StorageObjectMetadata {
  return {
    key: object.key,
    version: object.version,
    size: object.size,
    etag: object.etag,
    httpEtag: object.httpEtag,
    uploadedAt: object.uploaded,
    storageClass: object.storageClass,
    ...(object.httpMetadata === undefined ? {} : { httpMetadata: object.httpMetadata }),
    ...(object.customMetadata === undefined ? {} : { customMetadata: object.customMetadata }),
  };
}

/**
 * Distinguishes a successful R2 body response from conditional metadata-only output.
 *
 * @param object - Object returned by an R2 conditional get.
 * @returns True when the response exposes a readable body.
 */
function isR2ObjectBody(object: R2Object): object is R2ObjectBody {
  return "body" in object;
}

/**
 * Converts the single supported checksum choice into native R2 put options.
 *
 * @param input - Package-level upload request.
 * @returns Native R2 options with at most one checksum field.
 */
function toPutOptions(input: PutStorageObjectInput): R2PutOptions {
  const options: R2PutOptions = {
    ...(input.httpMetadata === undefined ? {} : { httpMetadata: input.httpMetadata }),
    ...(input.customMetadata === undefined ? {} : { customMetadata: input.customMetadata }),
    ...(input.onlyIf === undefined ? {} : { onlyIf: input.onlyIf }),
  };

  if (input.checksum !== undefined) {
    options[input.checksum.algorithm] = input.checksum.value;
  }

  return options;
}

/**
 * Provides a typed, streaming-first facade over a Worker R2 binding.
 */
export class R2Storage {
  /**
   * Creates an R2 storage adapter.
   *
   * @param bucket - R2 binding generated from Wrangler configuration.
   */
  public constructor(private readonly bucket: R2Bucket) {}

  /**
   * Writes an object and returns metadata, or null when a conditional write fails.
   *
   * @param input - Key, body, metadata, and optional write precondition.
   * @returns Stored object metadata or null for a failed precondition.
   */
  public async put(input: PutStorageObjectInput): Promise<StorageObjectMetadata | null> {
    const key = assertValidObjectKey(input.key);
    const object = await this.bucket.put(key, input.body, toPutOptions(input));
    return object === null ? null : toStorageMetadata(object);
  }

  /**
   * Reads an object without buffering its body into Worker memory.
   *
   * @param key - Relative R2 object key.
   * @param options - Optional range and conditional request controls.
   * @returns A discriminated result for found, missing, or precondition-miss states.
   */
  public async get(
    key: string,
    options: GetStorageObjectOptions = {},
  ): Promise<GetStorageObjectResult> {
    const validatedKey = assertValidObjectKey(key);
    const object =
      options.onlyIf === undefined
        ? await this.bucket.get(validatedKey, options)
        : await this.bucket.get(validatedKey, {
            ...options,
            onlyIf: options.onlyIf,
          });
    if (object === null) {
      return { kind: "not-found" };
    }

    // R2 returns metadata without a body when any supplied precondition fails.
    if (!isR2ObjectBody(object)) {
      return { kind: "precondition-failed", metadata: toStorageMetadata(object) };
    }

    return {
      kind: "found",
      metadata: toStorageMetadata(object),
      body: object.body,
      ...(object.range === undefined ? {} : { range: object.range }),
    };
  }

  /**
   * Reads object metadata without downloading the object body.
   *
   * @param key - Relative R2 object key.
   * @returns Object metadata or null when the key is absent.
   */
  public async head(key: string): Promise<StorageObjectMetadata | null> {
    const object = await this.bucket.head(assertValidObjectKey(key));
    return object === null ? null : toStorageMetadata(object);
  }

  /**
   * Deletes one or more validated object keys.
   *
   * @param keys - A key or bounded list of keys to delete.
   * @returns A promise that resolves after R2 confirms deletion.
   */
  public async delete(keys: string | readonly string[]): Promise<void> {
    const validated =
      typeof keys === "string"
        ? assertValidObjectKey(keys)
        : keys.map((key) => assertValidObjectKey(key));

    // The native R2 API accepts at most 1,000 object keys in one delete call.
    if (Array.isArray(validated) && (validated.length === 0 || validated.length > 1_000)) {
      throw new RangeError("R2 delete batches must contain between 1 and 1,000 object keys.");
    }
    await this.bucket.delete(validated);
  }

  /**
   * Iterates all objects under a prefix using R2's truncation cursor.
   *
   * @param prefix - Optional validated key prefix.
   * @returns An async sequence of object metadata.
   */
  public async *listAll(prefix?: string): AsyncGenerator<StorageObjectMetadata> {
    const normalizedPrefix = prefix === undefined ? undefined : assertValidObjectKey(prefix);
    let cursor: string | undefined;

    do {
      const page = await this.bucket.list({
        ...(normalizedPrefix === undefined ? {} : { prefix: normalizedPrefix }),
        ...(cursor === undefined ? {} : { cursor }),
        include: ["httpMetadata", "customMetadata"],
      });

      for (const object of page.objects) {
        yield toStorageMetadata(object);
      }

      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor !== undefined);
  }
}

/**
 * Streams a successful R2 read as an HTTP response with safe metadata headers.
 *
 * @param result - Successful result from R2Storage.get().
 * @param options - Optional cache, download, and status overrides.
 * @returns A streaming Response suitable for Hono or a Worker handler.
 */
export function createStorageObjectResponse(
  result: Extract<GetStorageObjectResult, { kind: "found" }>,
  options: StorageResponseOptions = {},
): Response {
  const headers = new Headers();
  const metadata = result.metadata.httpMetadata;

  if (metadata?.contentType !== undefined) {
    headers.set("content-type", metadata.contentType);
  }
  if (metadata?.contentLanguage !== undefined) {
    headers.set("content-language", metadata.contentLanguage);
  }
  if (metadata?.contentEncoding !== undefined) {
    headers.set("content-encoding", metadata.contentEncoding);
  }
  if (metadata?.cacheExpiry !== undefined) {
    headers.set("expires", metadata.cacheExpiry.toUTCString());
  }

  headers.set("etag", result.metadata.httpEtag);
  headers.set("accept-ranges", "bytes");
  const rangeStart =
    result.range === undefined
      ? undefined
      : "suffix" in result.range
        ? Math.max(0, result.metadata.size - result.range.suffix)
        : (result.range.offset ?? 0);
  const responseLength =
    result.range === undefined
      ? result.metadata.size
      : "length" in result.range && result.range.length !== undefined
        ? result.range.length
        : result.metadata.size - (rangeStart ?? 0);
  headers.set("content-length", String(responseLength));

  if (rangeStart !== undefined) {
    const rangeEnd = Math.max(rangeStart, rangeStart + responseLength - 1);
    headers.set("content-range", `bytes ${rangeStart}-${rangeEnd}/${result.metadata.size}`);
  }

  const cacheControl = options.cacheControl ?? metadata?.cacheControl;
  if (cacheControl !== undefined) {
    headers.set("cache-control", cacheControl);
  }

  const disposition = options.contentDisposition ?? metadata?.contentDisposition;
  if (disposition !== undefined) {
    headers.set("content-disposition", disposition);
  }

  return new Response(result.body, {
    status: options.status ?? (result.range === undefined ? 200 : 206),
    headers,
  });
}
