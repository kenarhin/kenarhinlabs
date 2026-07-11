/**
 * Represents an expected domain or application failure without coupling the
 * domain layer to HTTP response objects.
 */
export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Readonly<Record<string, unknown>> | undefined;
  readonly expose: boolean;

  constructor(options: {
    code: string;
    message: string;
    status: number;
    details?: Readonly<Record<string, unknown>>;
    expose?: boolean;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.expose = options.expose ?? options.status < 500;
  }
}

/** Creates the canonical unauthorized failure used across runtime adapters. */
export function unauthorized(message = "Authentication is required"): AppError {
  return new AppError({ code: "AUTH_REQUIRED", message, status: 401 });
}

/** Creates a permission failure without disclosing internal role assignments. */
export function forbidden(message = "You do not have permission to perform this action"): AppError {
  return new AppError({ code: "FORBIDDEN", message, status: 403 });
}

/** Creates a dependency failure that remains safe to expose to API clients. */
export function dependencyUnavailable(dependency: string): AppError {
  return new AppError({
    code: "DEPENDENCY_UNAVAILABLE",
    message: `${dependency} is temporarily unavailable`,
    status: 503,
  });
}

/** Narrows unknown errors to the shared application error contract. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
