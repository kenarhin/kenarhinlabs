import { AppError } from "../errors/app-error";

export const CONTENT_STATUSES = ["draft", "review", "scheduled", "published", "archived"] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

const ALLOWED_TRANSITIONS: Readonly<Record<ContentStatus, ReadonlySet<ContentStatus>>> = {
  draft: new Set(["review", "archived"]),
  review: new Set(["draft", "scheduled", "published", "archived"]),
  scheduled: new Set(["draft", "review", "published", "archived"]),
  published: new Set(["draft", "archived"]),
  archived: new Set(["draft"]),
};

/**
 * Enforces the canonical content lifecycle independently from Hono or the
 * persistence implementation.
 */
export function assertContentTransition(from: ContentStatus, to: ContentStatus): void {
  if (from === to) {
    return;
  }

  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    throw new AppError({
      code: "CONTENT_STATUS_TRANSITION_INVALID",
      message: `Content cannot move from ${from} to ${to}`,
      status: 409,
      details: { from, to },
    });
  }
}

/** Ensures scheduled publication is set in the future before persistence. */
export function assertFutureSchedule(scheduledFor: Date, now = new Date()): void {
  if (scheduledFor.getTime() <= now.getTime()) {
    throw new AppError({
      code: "CONTENT_SCHEDULE_INVALID",
      message: "Scheduled publication must be in the future",
      status: 422,
    });
  }
}
