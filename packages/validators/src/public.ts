import { z } from "zod";

import { emailSchema, paginationSchema, slugSchema } from "./common";

export const publicContentTypes = [
  "post",
  "case_study",
  "stack_guide",
  "lab_note",
  "service_page",
  "landing_page",
  "tool_page",
  "offer_page",
  "legal_page",
  "product_update",
] as const;

export const publicContentParamsSchema = z.strictObject({
  type: z.enum(publicContentTypes),
  slug: slugSchema,
});

export const publicListQuerySchema = paginationSchema.extend({
  category: slugSchema.optional(),
  search: z.string().trim().min(2).max(120).optional(),
});

export const leadInputSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(160),
    email: emailSchema.optional(),
    phone: z.string().trim().min(7).max(32).optional(),
    company: z.string().trim().min(2).max(200).optional(),
    interest: z.string().trim().min(2).max(80).optional(),
    message: z.string().trim().min(10).max(10_000).optional(),
    source: z.string().trim().min(2).max(80).default("website"),
    metadata: z.record(z.string(), z.unknown()).default({}),
    turnstileToken: z.string().trim().min(1).max(2_048).optional(),
  })
  .refine((value) => value.email !== undefined || value.phone !== undefined, {
    message: "An email address or phone number is required",
    path: ["email"],
  });

export const contactInputSchema = z.strictObject({
  name: z.string().trim().min(2).max(160),
  email: emailSchema,
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(10_000),
  turnstileToken: z.string().trim().min(1).max(2_048).optional(),
});

export type ContactInput = z.infer<typeof contactInputSchema>;
export type LeadInput = z.infer<typeof leadInputSchema>;
export type PublicContentParams = z.infer<typeof publicContentParamsSchema>;
export type PublicListQuery = z.infer<typeof publicListQuerySchema>;
