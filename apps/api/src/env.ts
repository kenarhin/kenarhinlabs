import { AppError } from "@labs/core";
import { z } from "zod";

// Worker bindings also contain generated platform objects such as Hyperdrive and
// rate limiters. The runtime configuration boundary validates only string vars
// and secrets while allowing those independently typed bindings to pass through.
const runtimeEnvSchema = z.object({
  ALLOWED_ORIGINS: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
  ENVIRONMENT: z.enum(["development", "preview", "production", "test"]),
  CLOUDFLARE_EMAIL_WEBHOOK_SECRET: z.string().min(32).max(512),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().int().min(100).max(10_000).default(2_000),
  SUPABASE_JWT_AUDIENCE: z.string().trim().min(1).max(120).default("authenticated"),
  SUPABASE_WEBHOOK_SECRET: z.string().min(32).max(512),
  SUPABASE_URL: z.url().refine((value) => value.startsWith("https://"), {
    message: "SUPABASE_URL must use HTTPS",
  }),
  INTERNAL_QUEUE_WEBHOOK_SECRET: z.string().min(32).max(512),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

/** Validates bindings at the request boundary without reading process.env. */
export function parseRuntimeEnv(bindings: CloudflareBindings): RuntimeEnv {
  const parsed = runtimeEnvSchema.safeParse(bindings);
  if (!parsed.success) {
    throw new AppError({
      code: "RUNTIME_CONFIGURATION_INVALID",
      message: "The API runtime configuration is invalid",
      status: 500,
      cause: parsed.error,
    });
  }

  return parsed.data;
}
