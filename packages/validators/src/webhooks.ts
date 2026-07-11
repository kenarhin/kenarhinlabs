import { z } from "zod";

export const webhookSourceSchema = z.enum(["supabase", "cloudflare-email", "internal-queue"]);

export const webhookEnvelopeSchema = z.strictObject({
  id: z.string().trim().min(1).max(255),
  type: z.string().trim().min(1).max(160),
  occurredAt: z.iso.datetime({ offset: true }),
  data: z.record(z.string(), z.unknown()),
});

export type WebhookEnvelope = z.infer<typeof webhookEnvelopeSchema>;
export type WebhookSource = z.infer<typeof webhookSourceSchema>;
