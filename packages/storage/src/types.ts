/**
 * Describes the object body types accepted by the native R2 Workers binding.
 */
export type R2ObjectBodyInput =
  ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null;

/**
 * Captures durable object metadata without exposing an R2 response body.
 */
export interface StorageObjectMetadata {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploadedAt: Date;
  storageClass: string;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Readonly<Record<string, string>>;
}

/**
 * Defines a bounded upload request passed to the R2 storage adapter.
 */
export interface PutStorageObjectInput {
  key: string;
  body: R2ObjectBodyInput;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  onlyIf?: R2Conditional | Headers;
  checksum?:
    | { algorithm: "md5"; value: ArrayBuffer | ArrayBufferView | string }
    | { algorithm: "sha1"; value: ArrayBuffer | ArrayBufferView | string }
    | { algorithm: "sha256"; value: ArrayBuffer | ArrayBufferView | string }
    | { algorithm: "sha384"; value: ArrayBuffer | ArrayBufferView | string }
    | { algorithm: "sha512"; value: ArrayBuffer | ArrayBufferView | string };
}

/**
 * Defines conditional and range options for retrieving an R2 object.
 */
export interface GetStorageObjectOptions {
  onlyIf?: R2Conditional | Headers;
  range?: R2Range | Headers;
}

/**
 * Represents all outcomes from an R2 get operation, including precondition misses.
 */
export type GetStorageObjectResult =
  | { kind: "not-found" }
  | { kind: "precondition-failed"; metadata: StorageObjectMetadata }
  | {
      kind: "found";
      metadata: StorageObjectMetadata;
      body: ReadableStream;
      range?: R2Range;
    };

/**
 * Controls the cache and download headers added when streaming an R2 object.
 */
export interface StorageResponseOptions {
  cacheControl?: string;
  contentDisposition?: string;
  status?: number;
}
