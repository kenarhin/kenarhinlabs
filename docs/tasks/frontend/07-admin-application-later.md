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

Several admin mutation and projection ports remain fail-closed in the backend. The admin program
must re-check those contracts before implementation rather than treating route scaffolds as working
persistence.
