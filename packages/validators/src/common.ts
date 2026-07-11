import { z } from "zod";

export const uuidSchema = z.uuid();
export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens");
export const emailSchema = z
  .email()
  .max(320)
  .transform((value) => value.toLowerCase());

export const paginationSchema = z.strictObject({
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
