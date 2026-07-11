# `@labs/sync`

Idempotent Supabase Postgres outbox to Cloudflare D1 projection primitives.

The Queue carries only the outbox event ID. The consumer reloads the canonical event through an
application-owned `OutboxEventSource`, allowlists public fields through a registered projector, and
writes D1 mutations plus `projection_receipts` in one transactional `batch()` call.

Receipt watermarks suppress duplicate and stale versions. If D1 commits but the Postgres
acknowledgement fails, redelivery sees the receipt and safely acknowledges the canonical event
without replaying the mutation.
