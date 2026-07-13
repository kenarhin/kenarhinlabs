# Backend Platform Provisioning

This guide defines the Cloudflare resources and environment conventions required by the Ken Arhin
Labs backend. Repository setup and local validation do not mutate cloud resources automatically; the
production resources listed below were deliberately provisioned through the Cloudflare API MCP after
explicit user authorization.

## Remote control boundaries

- Supabase inspection and mutation must use the Supabase MCP connector. Do not use the Supabase CLI.
- Before any Supabase query or migration, retrieve the connector's project URL and verify that it is
  the intended Ken Arhin Labs project. A connector aimed at another project is a hard stop.
- Agent-driven Cloudflare account inspection or mutation must use the Cloudflare API MCP. Resource
  creation commands below are a reviewed human-operator runbook, not commands executed during
  repository setup.
- No remote mutation is implied by implementing or validating these repository files.

## Current production resource state

Verified through the Cloudflare API MCP on 2026-07-11:

| Resource                           | State                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| D1 `kenarhinlabs-public`           | Provisioned in WEUR as `a1775a3b-8626-4baf-a624-c06a5847d183`; migration `0001_public_read_model.sql` applied and tracked. |
| R2 `kenarhinlabs-media`            | Provisioned in WEUR with the Standard storage class; remains private by default.                                           |
| Content, email, and media Queues   | Three primary queues and their three dead-letter queues are provisioned.                                                   |
| Email Sending                      | `kenarhinlabs.com` is enabled with its return-path and DKIM sending configuration active.                                  |
| Hyperdrive `kenarhinlabs-supabase` | Provisioned as `017ff91c40f646af9901ddd4268225b3`; live readiness proves the direct Supabase connection works.             |
| Workflow and Queue consumers       | `kenarhinlabs-sync` and all three Worker consumers are deployed with their configured retries and dead-letter queues.      |
| API Worker                         | `kenarhinlabs-api` is deployed at `https://api.kenarhinlabs.com`; live health and readiness checks pass.                   |

Future binding changes must regenerate Worker types and pass the dry-run gate before deployment. The
three webhook secrets are declared in `secrets.required`, so Wrangler blocks deployments if any
required secret is missing.

## Binding contract

The API Worker is the deployment owner for the reusable backend packages. Its generated `Env` type
must expose these bindings:

| Binding         | Cloudflare resource         | Purpose                                                         |
| --------------- | --------------------------- | --------------------------------------------------------------- |
| `HYPERDRIVE`    | Hyperdrive configuration    | Pooled Worker access to the direct Supabase Postgres connection |
| `D1_PUBLIC`     | D1 database                 | Rebuildable, non-sensitive public read model                    |
| `R2_MEDIA`      | R2 bucket                   | Public and private media objects                                |
| `EMAIL`         | Email Service send binding  | Transactional business email                                    |
| `CONTENT_QUEUE` | Queue producer and consumer | Supabase outbox to D1 projection jobs                           |
| `EMAIL_QUEUE`   | Queue producer and consumer | Transactional email delivery jobs                               |
| `MEDIA_QUEUE`   | Queue producer and consumer | Media inspection, derivative, and purge jobs                    |
| `SYNC_WORKFLOW` | Workflow binding            | Durable multi-step projection or rebuild operations             |

Wrangler configuration is the source of truth. Bindings and `vars` are non-inheritable, so preview
and production environments must repeat their complete binding declarations.

## Resource naming

Keep environments physically separate. Recommended names are:

| Environment | Worker                     | D1                            | R2                           | Queue suffix     |
| ----------- | -------------------------- | ----------------------------- | ---------------------------- | ---------------- |
| Local       | Wrangler local simulation  | Local D1 state                | Local R2 state               | Local simulation |
| Preview     | `kenarhinlabs-api-preview` | `kenarhinlabs-public-preview` | `kenarhinlabs-media-preview` | `-preview`       |
| Production  | `kenarhinlabs-api`         | `kenarhinlabs-public`         | `kenarhinlabs-media`         | no suffix        |

Do not point local development at production resources. Use remote bindings only for a deliberate
integration test against a dedicated preview resource.

## Non-secret configuration and secrets

Safe Wrangler `vars` include environment labels and public service origins:

```txt
ENVIRONMENT
PUBLIC_SITE_URL
ADMIN_SITE_URL
R2_PUBLIC_BASE_URL
EMAIL_FROM_ADDRESS
EMAIL_FROM_NAME
```

Secrets belong in `.dev.vars` for local development and deployed secret storage for remote
environments:

```txt
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_JWT_AUDIENCE
TURNSTILE_SECRET_KEY
INTERNAL_WEBHOOK_SECRET
```

The native `EMAIL` binding does not require an Email Service API token inside the Worker. The SMTP
token used by Supabase Auth is configured in Supabase and must not be copied into the application
repository.

Supabase's current public client key is `SUPABASE_PUBLISHABLE_KEY` with an `sb_publishable_...`
value. The legacy JWT-based `anon` and `service_role` API keys are not used by this project.
References to `anon`, `authenticated`, and `service_role` in SQL remain correct because those are
built-in Postgres roles selected by the API gateway, including when modern keys are used.

## Wrangler configuration shape

The deployable configuration belongs to `apps/api/wrangler.jsonc`, which is owned by the API lane.
Replace all placeholder IDs after provisioning and repeat non-inheritable bindings under each named
environment.

```jsonc
{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "kenarhinlabs-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-11",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "logs": { "head_sampling_rate": 1 },
    "traces": { "enabled": true, "head_sampling_rate": 0.05 },
  },
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<HYPERDRIVE_ID>" }],
  "d1_databases": [
    {
      "binding": "D1_PUBLIC",
      "database_name": "kenarhinlabs-public",
      "database_id": "<D1_DATABASE_ID>",
      "migrations_dir": "../../packages/db/d1/migrations",
    },
  ],
  "r2_buckets": [{ "binding": "R2_MEDIA", "bucket_name": "kenarhinlabs-media" }],
  "send_email": [
    {
      "name": "EMAIL",
      "allowed_sender_addresses": [
        "no-reply@kenarhinlabs.com",
        "hello@kenarhinlabs.com",
        "projects@kenarhinlabs.com",
        "support@kenarhinlabs.com",
      ],
    },
  ],
  "queues": {
    "producers": [
      { "binding": "CONTENT_QUEUE", "queue": "kenarhinlabs-content" },
      { "binding": "EMAIL_QUEUE", "queue": "kenarhinlabs-email" },
      { "binding": "MEDIA_QUEUE", "queue": "kenarhinlabs-media" },
    ],
    "consumers": [
      {
        "queue": "kenarhinlabs-content",
        "max_batch_size": 10,
        "max_batch_timeout": 5,
        "max_retries": 8,
        "retry_delay": 15,
        "dead_letter_queue": "kenarhinlabs-content-dlq",
      },
      {
        "queue": "kenarhinlabs-email",
        "max_batch_size": 10,
        "max_batch_timeout": 5,
        "max_retries": 8,
        "retry_delay": 30,
        "dead_letter_queue": "kenarhinlabs-email-dlq",
      },
      {
        "queue": "kenarhinlabs-media",
        "max_batch_size": 5,
        "max_batch_timeout": 10,
        "max_retries": 5,
        "retry_delay": 30,
        "dead_letter_queue": "kenarhinlabs-media-dlq",
      },
    ],
  },
  "workflows": [
    {
      "binding": "SYNC_WORKFLOW",
      "name": "kenarhinlabs-sync",
      "class_name": "SyncWorkflow",
    },
  ],
}
```

`allowed_sender_addresses` is an outbound `From` restriction, not an inbound mailbox or forwarding
configuration. The approved roles are:

```txt
no-reply@kenarhinlabs.com   Automated auth and system delivery
hello@kenarhinlabs.com      General business and website correspondence
projects@kenarhinlabs.com   Project intake, confirmations, and project correspondence
support@kenarhinlabs.com    Existing-client and technical support
```

Keep `contact@kenarhinlabs.com` as the inbound privacy, legal, security, rights, and policy route.
Only add it to the allowed sender list if a reviewed backend workflow must send with that address in
the `From` header. Public routing rules are maintained in
[`docs/frontend-contact-channels.md`](frontend-contact-channels.md).

## Provisioning sequence

These commands mutate the selected Cloudflare account. Review the active account with
`pnpm exec wrangler whoami` before running them.

```sh
# Public read model and media storage
pnpm exec wrangler d1 create kenarhinlabs-public
pnpm exec wrangler r2 bucket create kenarhinlabs-media

# Primary queues and dead-letter queues
pnpm exec wrangler queues create kenarhinlabs-content
pnpm exec wrangler queues create kenarhinlabs-content-dlq
pnpm exec wrangler queues create kenarhinlabs-email
pnpm exec wrangler queues create kenarhinlabs-email-dlq
pnpm exec wrangler queues create kenarhinlabs-media
pnpm exec wrangler queues create kenarhinlabs-media-dlq

# Hyperdrive must use the Supabase direct Postgres connection, not Supavisor.
pnpm exec wrangler hyperdrive create kenarhinlabs-supabase \
  --connection-string "$SUPABASE_DIRECT_DATABASE_URL"
```

Copy returned resource IDs into the correct Wrangler environment. Never commit database credentials
or pass a literal password in shell history.

## Email Service and Supabase Auth

1. Onboard `kenarhinlabs.com` in Cloudflare Email Service and allow Cloudflare to add its SPF, DKIM,
   bounce, and DMARC records.
2. Confirm the exact sending domain and allowed sender addresses.
3. Keep both HTML and plain-text bodies for every transactional template.
4. Configure Supabase Auth custom SMTP separately with `smtp.mx.cloudflare.net`, implicit TLS on
   port `465`, username `api_token`, and a narrowly scoped Email Sending token.
5. Use Email Service only for transactional mail. Marketing campaigns need a provider designed for
   bulk email and consent management.

## Database and type validation

Apply the repository D1 migrations locally before remote environments:

```sh
pnpm exec wrangler d1 migrations apply kenarhinlabs-public --local \
  --config apps/api/wrangler.jsonc
pnpm exec wrangler d1 migrations apply kenarhinlabs-public --remote \
  --config apps/api/wrangler.jsonc
```

After every binding change:

```sh
pnpm --filter @labs/api cf-typegen
pnpm exec wrangler deploy --dry-run --config apps/api/wrangler.jsonc
```

The API entrypoint must wire queue names to `consumeProjectionBatch`, `consumeEmailBatch`, and
`consumeMediaBatch`, and export a `SyncWorkflow` class that calls `runProjectionWorkflow`. The
package helpers deliberately do not own Supabase credentials or API routes.

## Operational checks

- Log structured objects containing request, event, job, and provider message IDs; never log bodies,
  recipients, credentials, or binding objects.
- Monitor D1 projection lag, Queue retry/DLQ counts, Email Service delivery failures, and R2
  operation errors.
- Rebuild D1 from Supabase by replaying canonical records with monotonically increasing
  `sync_version` values.
- Treat Queue delivery as at least once. The D1 receipt/watermark is the idempotency boundary; email
  claims reduce duplicates but provider delivery cannot be made strictly exactly once.
- Test preview resources before production and run a Wrangler dry run before every deployment.

## Current official references

- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [D1 Workers binding API](https://developers.cloudflare.com/d1/worker-api/)
- [Queues JavaScript APIs](https://developers.cloudflare.com/queues/configuration/javascript-apis/)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows/)
- [Email Service Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Workers observability](https://developers.cloudflare.com/workers/observability/)
- [Hyperdrive with Supabase](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/)
- [Supabase database webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
