import { AppError } from "@labs/core";
import { z, type ZodType } from "zod";

/** Converts Zod issues into a compact, non-sensitive API validation payload. */
function validationError(error: z.ZodError): AppError {
  return new AppError({
    code: "VALIDATION_FAILED",
    message: "The request data is invalid",
    status: 422,
    details: {
      issues: error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.join("."),
      })),
    },
  });
}

/** Parses a bounded JSON request and applies the supplied shared schema. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new AppError({
      code: "CONTENT_TYPE_UNSUPPORTED",
      message: "Content-Type must be application/json",
      status: 415,
    });
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch (error) {
    throw new AppError({
      code: "JSON_INVALID",
      message: "The request body is not valid JSON",
      status: 400,
      cause: error,
    });
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw validationError(parsed.error);
  }

  return parsed.data;
}

/** Validates route parameters or query data without relying on type assertions. */
export function parseInput<T>(value: unknown, schema: ZodType<T>): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw validationError(parsed.error);
  }

  return parsed.data;
}

/** Converts URL search parameters into the object shape expected by Zod. */
export function queryObject(url: URL): Readonly<Record<string, string>> {
  return Object.fromEntries(url.searchParams.entries());
}
