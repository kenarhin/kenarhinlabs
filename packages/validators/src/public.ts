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

const messageInputFields = {
  name: z.string().trim().min(2).max(160),
  email: emailSchema,
  subject: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .refine((value) => !value.includes("\r") && !value.includes("\n"), {
      message: "Subject must be a single line",
    }),
  message: z.string().trim().min(10).max(10_000),
  turnstileToken: z.string().trim().min(1).max(2_048).optional(),
} as const;

/** General business and website inquiry submitted by the future Contact page. */
export const inquiryInputSchema = z.strictObject(messageInputFields);

/** Structured new-project intake submitted by the future Start-a-Project page. */
export const projectIntakeInputSchema = z.strictObject({
  ...messageInputFields,
  company: z.string().trim().min(2).max(200).optional(),
  budgetRange: z.enum(["under_5k", "5k_15k", "15k_50k", "50k_plus", "not_sure"]).optional(),
  timeframe: z.string().trim().min(2).max(120).optional(),
  services: z.array(z.string().trim().min(2).max(80)).max(8).optional(),
});

/** Existing-client support request submitted by a future Support surface. */
export const supportRequestInputSchema = z.strictObject({
  ...messageInputFields,
  clientReference: z.string().trim().min(2).max(160).optional(),
});

/**
 * Legacy project-intake contract retained for the currently deployed frontend.
 * New frontend work should use projectIntakeInputSchema at /public/project-intake.
 */
export const contactInputSchema = z.strictObject(messageInputFields);

export type ContactInput = z.infer<typeof contactInputSchema>;
export type InquiryInput = z.infer<typeof inquiryInputSchema>;
export type LeadInput = z.infer<typeof leadInputSchema>;
export type ProjectIntakeInput = z.infer<typeof projectIntakeInputSchema>;
export type PublicContentParams = z.infer<typeof publicContentParamsSchema>;
export type PublicListQuery = z.infer<typeof publicListQuerySchema>;
export type SupportRequestInput = z.infer<typeof supportRequestInputSchema>;
