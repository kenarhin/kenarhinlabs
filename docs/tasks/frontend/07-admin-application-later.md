# Lane 07 — Admin Application (Later)

## Status

Status: deferred until the Astro public foundation is accepted.

## Scope

The TanStack Start business operating system, app-local shadcn/Base UI primitives, authentication,
the first complete content-publishing workflow, and later CRM/operations domains.

## Checklist

- [ ] Re-audit the installed TanStack Start, React, Base UI, shadcn, Tailwind, and Cloudflare setup.
- [ ] Build the secure app shell and explicit auth states.
- [ ] Build one end-to-end content workflow before broad dashboard expansion.
- [ ] Integrate real API permissions, validation, request IDs, and publishing status.
- [ ] Integrate admin PWA draft storage, retry safety, update blocking, and logout cleanup.
- [ ] Build remaining CRM, project, commerce, media, communication, and settings domains in bounded
      lanes.

## Blockers or handoff notes

Several unrelated admin mutation and projection ports remain fail-closed. The communications thread
list/detail/reply/status/attachment backend is deployed and ready for frontend work; use
[`email-channels-and-inbox-frontend-handoff.md`](email-channels-and-inbox-frontend-handoff.md) as
the source of truth instead of the older generic email route scaffolds.
