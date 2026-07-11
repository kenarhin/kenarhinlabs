const DEFAULT_MAX_KEY_BYTES = 1_024;

/**
 * Validates and returns an R2 object key.
 *
 * @param key - Candidate key supplied by trusted code or an API boundary.
 * @param maxBytes - Maximum UTF-8 byte length accepted by the application.
 * @returns The unchanged key after validation.
 */
export function assertValidObjectKey(key: string, maxBytes = DEFAULT_MAX_KEY_BYTES): string {
  if (key.length === 0 || key.startsWith("/")) {
    throw new TypeError("Object keys must be non-empty and relative.");
  }

  if (key.includes("\0") || key.split("/").some((segment) => segment === "..")) {
    throw new TypeError("Object keys cannot contain null bytes or parent segments.");
  }

  if (new TextEncoder().encode(key).byteLength > maxBytes) {
    throw new TypeError(`Object keys cannot exceed ${maxBytes} UTF-8 bytes.`);
  }

  return key;
}

/**
 * Builds a public object URL while preserving path separators and encoding each segment.
 *
 * @param publicBaseUrl - HTTPS origin or path prefix for the public R2 domain.
 * @param key - Valid R2 object key.
 * @returns A fully qualified URL for the object.
 */
export function buildPublicObjectUrl(publicBaseUrl: string, key: string): URL {
  const base = new URL(publicBaseUrl);
  if (base.protocol !== "https:") {
    throw new TypeError("Public object URLs must use HTTPS.");
  }

  const encodedKey = assertValidObjectKey(key)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  base.pathname = `${basePath}${encodedKey}`;
  return base;
}
