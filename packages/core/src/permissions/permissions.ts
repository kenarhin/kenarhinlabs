import { forbidden } from "../errors/app-error";

export const PERMISSIONS = {
  CONTENT_READ: "content.read",
  CONTENT_WRITE: "content.write",
  CONTENT_PUBLISH: "content.publish",
  CONTENT_SCHEDULE: "content.schedule",
  CONTENT_DELETE: "content.delete",
  CRM_READ: "crm.read",
  CRM_WRITE: "crm.write",
  COMMERCE_READ: "commerce.read",
  COMMERCE_WRITE: "commerce.write",
  MEDIA_READ: "media.read",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_DELETE: "media.delete",
  EMAIL_READ: "email.read",
  EMAIL_SEND: "email.send",
  EMAIL_MANAGE: "email.manage",
  ANALYTICS_READ: "analytics.read",
  SYSTEM_MANAGE: "system.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Tests whether a resolved permission set contains a required capability. */
export function can(permissions: ReadonlySet<string>, permission: Permission): boolean {
  return permissions.has(permission);
}

/** Enforces a domain permission and throws the shared forbidden error on failure. */
export function requirePermission(permissions: ReadonlySet<string>, permission: Permission): void {
  if (!can(permissions, permission)) {
    throw forbidden();
  }
}
