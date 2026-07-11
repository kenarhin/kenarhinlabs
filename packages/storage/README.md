# `@labs/storage`

Worker-native R2 primitives for safe object keys, streaming reads, conditional writes, HTTP
responses, public URLs, and media queue contracts.

The package accepts a generated `R2Bucket` binding. It does not read credentials, construct
Cloudflare REST requests, or buffer object bodies by default.

```ts
import { R2Storage, createStorageObjectResponse } from "@labs/storage";

/** Streams one public object from the configured R2 binding. */
export async function serveObject(bucket: R2Bucket, key: string): Promise<Response> {
  const result = await new R2Storage(bucket).get(key);
  if (result.kind === "not-found") return new Response("Not found", { status: 404 });
  if (result.kind === "precondition-failed") return new Response(null, { status: 412 });
  return createStorageObjectResponse(result);
}
```
