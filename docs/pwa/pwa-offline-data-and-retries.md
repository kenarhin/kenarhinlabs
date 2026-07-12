# PWA Offline Data, Drafts, and Retry Operations

_Last updated: 2026-07-11_

## Principle

Offline resilience must be explicit and domain-aware.

```txt
HTTP cache
  Public pages and static assets only

DraftStore
  Local user-authored work in progress

RetryQueue
  Explicit replay metadata for reviewed operations
```

Neither IndexedDB store is a secure vault or authoritative database.

## IndexedDB layout

Default database:

```txt
ken-arhin-labs-pwa
```

Version:

```txt
1
```

Object stores:

```txt
drafts
retry_queue
metadata
```

The database exists separately on each origin. Public and admin applications do not see each other's records.

## JSON-only payload contract

The shared types permit JSON values:

```ts
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }
```

Do not store:

- class instances;
- File or Blob objects in the current abstraction;
- functions;
- DOM nodes;
- request or response objects;
- authentication clients;
- secrets.

Store an R2 object key or upload session identifier rather than a raw large file when a future upload-resume design requires it.

## Draft record model

```ts
interface DraftRecord<TPayload> {
  key: string
  ownerId: string
  kind: string
  entityId?: string
  schemaVersion: number
  payload: TPayload
  createdAt: string
  updatedAt: string
  expiresAt: string
}
```

### Key convention

Use deterministic keys:

```txt
content:new:<local-id>
content:<content-id>
project:<project-id>:notes
lead:<lead-id>:response-draft
```

The same logical draft should reuse the same key.

### Owner convention

Use:

```txt
Supabase Auth user UUID
```

Do not use:

```txt
email address
display name
role
browser installation ID
```

### Kind convention

Use a stable domain name:

```txt
content
project-note
email-draft
lead-note
```

Changing the kind changes list/filter behavior, so treat it as schema.

### Schema version

Every feature must define its draft payload schema and migration policy.

Example:

```ts
interface ContentDraftV1 {
  title: string
  excerpt: string
  blocks: JsonValue[]
  serverRevision?: number
}
```

When the schema changes:

1. increment `schemaVersion`;
2. write a migration function for compatible drafts;
3. reject or offer export for incompatible drafts;
4. never assume an old payload matches current editor code.

## Autosave algorithm

Recommended sequence:

```txt
1. User changes a field.
2. Feature marks the model dirty.
3. Debounce local save for 1–3 seconds.
4. Serialize the approved minimum payload.
5. Save to DraftStore.
6. Update local-saved timestamp.
7. Attempt server save according to normal application behavior.
8. On successful server save, store returned revision.
9. Delete local draft only after the feature decides it is safely represented on the server.
```

Use one write at a time per draft key to avoid out-of-order autosaves. Cancel or sequence pending writes when the route unmounts.

## Restore algorithm

```txt
1. Authenticate user.
2. Load canonical server entity and revision.
3. Load local draft with the same owner and key.
4. Validate schema.
5. Compare local timestamp and server revision.
6. If local is meaningfully newer, ask to restore or discard.
7. Preserve both values until the user decides.
8. Log restoration without logging draft content.
```

A local timestamp alone does not prove the draft is newer when device time is wrong. Server revision or ETag comparison is preferred.

## Draft cleanup

Defaults:

```txt
TTL: 30 days
Maximum: 50 active drafts per owner
```

The store prunes expired records during writes. Applications should also prune during a safe idle or startup period.

On logout:

```ts
await draftStore.clearOwner(userId)
```

For a shared or public computer, clearing is mandatory. A future "keep local drafts on this device" feature would require explicit consent and a stronger threat review.

## Retry record model

A retry item contains:

```txt
id
ownerId
operation
mode
idempotencyKey
payload
status
attempts
maxAttempts
createdAt
updatedAt
nextAttemptAt
leaseUntil
expiresAt
lastError
```

Statuses:

```txt
pending
processing
failed
blocked
dead
```

Modes:

```txt
manual
automatic
```

The default is `manual`.

## Why retries are explicit

Generic background request replay can preserve request bodies or headers longer than expected, retry at browser-controlled times, and run with stale assumptions. The Ken Arhin Labs admin instead stores a domain operation and re-executes it through the current API client with current authentication.

This enables:

- fresh access-token acquisition;
- permission re-checking;
- idempotency keys;
- version/conflict checks;
- user review;
- normalized application errors.

## Server requirements for automatic retry

An operation may be marked `automatic` only when the server endpoint provides:

```txt
Idempotency-Key handling
Stable operation semantics
Authorization on every attempt
Validation on every attempt
Conflict detection or revision checking
Bounded payload size
Audit logging
Deterministic success response
Safe duplicate handling
```

The server should store idempotency records long enough to cover the client retry TTL.

## Retry processing

```ts
const summary = await queue.process({
  ownerId: user.id,
  limit: 5,
  execute: async (item) => {
    switch (item.operation) {
      case 'content.save-draft':
        await api.saveDraft(item.payload, {
          idempotencyKey: item.idempotencyKey,
        })
        return
      default:
        throw new NonRetryableOperationError(item.operation)
    }
  },
  normalizeError(error) {
    // Map transport, validation, conflict, auth, and server failures.
  },
})
```

Processing must run only after:

- the user is authenticated;
- the current owner matches the queued owner;
- the API is reachable;
- the application is not already processing the same operation class;
- current permissions are known or will be checked by the API.

## Error classification

Suggested mapping:

| Failure | Retryable | Result |
| --- | --- | --- |
| network timeout | yes | `failed`, backoff |
| DNS/transport failure | yes | `failed`, backoff |
| HTTP 429 | yes, use server guidance | `failed`, backoff |
| HTTP 500/502/503/504 | usually | `failed`, backoff |
| HTTP 401 | not automatically | `blocked`, require sign-in |
| HTTP 403 | no | `blocked` |
| HTTP 404 for deleted target | no | `blocked` |
| HTTP 409 revision conflict | no automatic overwrite | `blocked`, review |
| validation error | no | `blocked` |
| max attempts reached | no further automatic retry | `dead` |

Respect `Retry-After` where the API supplies it. The current package calculates bounded exponential backoff with jitter; an application may delay processing further based on server guidance.

## Operations that must remain manual

```txt
Publish or unpublish content
Send or forward email
Delete any business record
Change roles or permissions
Approve proposals or invoices
Trigger client-visible notifications
Run bulk changes
Modify billing or payment state
Rotate credentials or integrations
```

A manual queue is a recovery inbox, not an automatic executor.

## Payload minimization

Store only what the replay needs.

Bad:

```json
{
  "accessToken": "...",
  "entireClientRecord": {},
  "fullEmailThread": []
}
```

Better:

```json
{
  "contentId": "uuid",
  "expectedRevision": 12,
  "patch": {
    "title": "Updated title"
  }
}
```

## Quota and eviction

Browser storage can be evicted. The application should:

- request persistence only after user value is established;
- display local-save status honestly;
- monitor approximate usage;
- prune expired data;
- bound payload sizes and record counts;
- encourage server save when online;
- never claim local-only data is permanent.

## Multi-tab coordination

The current store uses leases for retry claims but does not provide a full cross-tab leader election system. Before automatic processing in multiple tabs:

- use the queue lease as the minimum duplicate guard;
- consider `BroadcastChannel` to announce processing;
- rely on server idempotency as the final duplicate boundary;
- test tab crashes and lease expiry.

## Security checklist

- no tokens, cookies, passwords, API keys, or service credentials;
- no full email bodies unless a future separately reviewed encrypted draft feature exists;
- no unrestricted client data snapshots;
- owner checked on every read, write, delete, and process;
- owner data cleared at logout;
- payload validated before restore or replay;
- current authorization re-evaluated by Hono;
- server idempotency required for automatic replay;
- error telemetry excludes payloads.
