import { z } from "zod";

import { emailSchema, paginationSchema, slugSchema, uuidSchema } from "./common";
import { publicContentTypes } from "./public";

export const adminListQuerySchema = paginationSchema.extend({
  status: z.string().trim().min(1).max(40).optional(),
  search: z.string().trim().min(2).max(120).optional(),
});

/** Channel-aware filters supported by the unified communications inbox. */
export const emailThreadListQuerySchema = z.strictObject({
  channel: z.enum(["general", "projects", "support", "privacy"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().trim().min(2).max(120).optional(),
  status: z.enum(["open", "waiting", "closed", "archived"]).optional(),
});

/** Human-authored plain-text reply; sender and recipient are server-derived. */
export const emailThreadReplySchema = z.strictObject({
  body: z.string().trim().min(1).max(240_000),
});

/** Explicit workflow changes allowed on an existing communications thread. */
export const updateEmailThreadSchema = z
  .strictObject({
    markRead: z.boolean().optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    status: z.enum(["open", "waiting", "closed", "archived"]).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one thread field is required",
  });

const contentBodySchema = z
  .strictObject({
    bodyFormat: z.enum(["markdown", "blocks", "html_sanitized"]),
    bodyMarkdown: z.string().max(500_000).nullable().optional(),
    bodyBlocks: z.array(z.record(z.string(), z.unknown())).max(10_000).nullable().optional(),
  })
  .refine(
    (value) =>
      (value.bodyFormat === "blocks" && value.bodyBlocks != null) ||
      (value.bodyFormat !== "blocks" && value.bodyMarkdown != null),
    { message: "The selected body format requires matching content" },
  );

export const createContentSchema = z
  .strictObject({
    type: z.enum(publicContentTypes),
    title: z.string().trim().min(2).max(240),
    slug: slugSchema,
    excerpt: z.string().trim().max(1_000).nullable().optional(),
    coverAssetId: uuidSchema.nullable().optional(),
    seoTitle: z.string().trim().max(70).nullable().optional(),
    seoDescription: z.string().trim().max(170).nullable().optional(),
    canonicalUrl: z.url().max(2_048).nullable().optional(),
  })
  .and(contentBodySchema);

export const updateContentSchema = z.strictObject({
  title: z.string().trim().min(2).max(240).optional(),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().max(1_000).nullable().optional(),
  bodyMarkdown: z.string().max(500_000).nullable().optional(),
  bodyBlocks: z.array(z.record(z.string(), z.unknown())).max(10_000).nullable().optional(),
  coverAssetId: uuidSchema.nullable().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(170).nullable().optional(),
  canonicalUrl: z.url().max(2_048).nullable().optional(),
  changeNote: z.string().trim().max(500).optional(),
});

export const scheduleContentSchema = z.strictObject({
  scheduledFor: z.iso.datetime({ offset: true }),
});

export const createClientSchema = z.strictObject({
  type: z.enum(["individual", "company", "organization"]),
  name: z.string().trim().min(2).max(200),
  slug: slugSchema.nullable().optional(),
  websiteUrl: z.url().max(2_048).nullable().optional(),
  industry: z.string().trim().max(120).nullable().optional(),
  source: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(20_000).nullable().optional(),
});

export const updateClientSchema = createClientSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one client field must be provided",
  });

export const createProjectSchema = z.strictObject({
  clientId: uuidSchema,
  name: z.string().trim().min(2).max(200),
  slug: slugSchema.nullable().optional(),
  type: z.string().trim().min(2).max(80),
  description: z.string().trim().max(20_000).nullable().optional(),
  startDate: z.iso.date().nullable().optional(),
  targetLaunchDate: z.iso.date().nullable().optional(),
});

export const createOfferSchema = z
  .strictObject({
    toolId: uuidSchema.nullable().optional(),
    title: z.string().trim().min(2).max(240),
    slug: slugSchema,
    description: z.string().trim().max(10_000).nullable().optional(),
    offerType: z.enum(["discount", "free_trial", "credit", "coupon", "bundle", "internal_service"]),
    code: z.string().trim().max(120).nullable().optional(),
    startsAt: z.iso.datetime({ offset: true }).nullable().optional(),
    endsAt: z.iso.datetime({ offset: true }).nullable().optional(),
    terms: z.string().trim().max(20_000).nullable().optional(),
  })
  .refine(
    (value) =>
      value.startsAt == null ||
      value.endsAt == null ||
      Date.parse(value.endsAt) > Date.parse(value.startsAt),
    { message: "Offer end time must be after its start time", path: ["endsAt"] },
  );

export const createEmailSchema = z.strictObject({
  to: z.array(emailSchema).min(1).max(50),
  cc: z.array(emailSchema).max(50).optional(),
  bcc: z.array(emailSchema).max(50).optional(),
  subject: z.string().trim().min(1).max(300),
  textBody: z.string().max(500_000).optional(),
  htmlBody: z.string().max(1_000_000).optional(),
  templateKey: z.string().trim().max(120).optional(),
  variables: z.record(z.string(), z.unknown()).default({}),
});

export const mediaUploadRequestSchema = z.strictObject({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(255),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024 * 1024),
  folderId: uuidSchema.nullable().optional(),
  visibility: z.enum(["public", "private"]).default("private"),
});

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateContentInput = z.infer<typeof createContentSchema>;
export type CreateEmailInput = z.infer<typeof createEmailSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type EmailThreadListQuery = z.infer<typeof emailThreadListQuerySchema>;
export type EmailThreadReplyInput = z.infer<typeof emailThreadReplySchema>;
export type MediaUploadRequest = z.infer<typeof mediaUploadRequestSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type UpdateEmailThreadInput = z.infer<typeof updateEmailThreadSchema>;
