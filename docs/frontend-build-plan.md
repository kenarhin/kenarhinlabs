# Ken Arhin Labs Frontend Build Plan

_Last updated: 2026-07-11_

This document defines the recommended sequence for building the permanent frontend architecture. It is not a temporary MVP stack. Each phase should leave the repository in a usable, verifiable state.

## Program Goals

```txt
Create a distinctive public experience without generic AI/SaaS styling.
Create a dependable admin operating system without rebuilding basic accessible controls.
Keep shared brand foundations consistent without forcing shared components.
Integrate with the backend through stable API contracts.
Ship progressively while protecting accessibility, performance, and maintainability.
```

## Phase 0 — Foundation Documentation

Deliverables:

```txt
DESIGN.md
frontend-architecture.md
frontend-design-system.md
frontend-motion-and-interaction.md
frontend-platform-provisioning.md
frontend-build-plan.md
packages/design
```

Verification:

```txt
DESIGN.md lints with no errors
package JSON is valid
shared CSS compiles through Tailwind v4
no framework components exist in packages/design
```

## Phase 1 — Public App Foundation

Deliverables:

```txt
Astro app in apps/web
Cloudflare Workers adapter
Tailwind CSS v4 and @labs/design integration
Base layout and metadata shell
Theme boot script and accessible theme control
Responsive navigation and footer
Private design-foundation route
Initial SEO and error pages
```

The design-foundation route should render:

```txt
Every semantic color role
Light and dark themes
Typography utilities
Spacing and radius examples
Typeset article sample
Focus and form states
Reduced-motion state
```

Gate:

- no shadcn dependency in `apps/web`;
- no raw palette values in normal component markup;
- keyboard navigation works;
- build and Cloudflare dry run pass;
- theme does not flash incorrectly.

## Phase 2 — Admin App Foundation

Deliverables:

```txt
TanStack Start app in apps/admin
Cloudflare Workers deployment foundation
Tailwind CSS v4 and @labs/design integration
Supabase Auth client boundary
Cloudflare Access assumptions documented
App-local shadcn initialization using Base UI
Admin shell, sidebar, top bar, command menu, and theme control
Query and API client foundation
```

Gate:

- shadcn files exist only inside `apps/admin`;
- `components.json` resolves aliases correctly;
- the installed shadcn skill reports the expected framework and base;
- auth states are explicit;
- keyboard navigation and focus behavior work;
- admin theme mappings preserve the shared identity.

## Phase 3 — Public Structural System

Deliverables:

```txt
Page container and editorial grid primitives
Section and rule conventions
Public buttons, links, labels, and form foundations
Content media and figure patterns
Typeset integration
Project evidence patterns
System diagram primitives
```

These are custom public components, not a generic shared library.

Gate:

- each component has a clear real page use;
- responsive layouts are intentional;
- no component exists only to imitate a template;
- content works without animation.

## Phase 4 — Living System Hero Prototype

Deliverables:

```txt
Static hero composition
SVG route and node model
GSAP entrance timeline
Idle state
First-scroll transformation
Desktop, tablet, mobile, and reduced-motion variants
Performance instrumentation
```

Prototype before completing the homepage. Use representative content and real service labels.

Gate:

- static state is complete;
- primary action is immediately available;
- animation tells the system story;
- no long scroll trap;
- cleanup works through navigation and resize;
- mobile and reduced-motion modes are authored, not disabled afterthoughts.

## Phase 5 — Homepage

Recommended section order:

```txt
Living System hero
Trust or proof strip
Selected work
Capabilities or services
How systems come together
Stacks and tools
Field Notes or Labs preview
Start-a-project call to action
Footer
```

The exact composition remains a design task. Avoid turning the order into a standard SaaS template.

Gate:

- first two viewports explain the company and show evidence;
- motion intensity decreases after the opening;
- each section has a distinct role;
- page performance remains within agreed budgets;
- analytics events measure meaningful exploration and conversion, not vanity motion.

## Phase 6 — Public Page Families

Build reusable page patterns in this order:

```txt
Work index and case study
Services index and detail
Field Notes index and article
Stacks/tools index and detail
Labs index and detail
Start a Project
Contact and legal
```

Gate for each family:

```txt
Loading, empty, error, and not-found states
SEO and structured metadata
Theme support
Responsive and reduced-motion behavior
Representative content tests
D1/API integration
```

## Phase 7 — First Admin Workflow

Choose one complete vertical slice, preferably content publishing:

```txt
Login
Content list
Create or edit
Validation
Autosave or explicit save
Preview
Publish
Queue/projection state
Audit/error feedback
```

Do not build every dashboard screen before one workflow works end to end.

Gate:

- permissions are enforced by the API;
- errors preserve useful request IDs;
- publishing states are visible;
- shadcn primitives remain business-neutral;
- offline or retry behavior is explicit.

## Phase 8 — Remaining Admin Domains

Recommended order:

```txt
Media
Leads
Clients and contacts
Projects and milestones
Tools and offers
Email workflows
Team, roles, and integrations
Analytics snapshots
```

Each domain should follow consistent table, form, filter, bulk action, and audit patterns without becoming visually monotonous.

## Phase 9 — PWA and Resilience

Public:

```txt
Manifest
Install experience
Offline page
Safe public caching
Update prompt
```

Admin:

```txt
App shell caching
Draft persistence
Safe retry queue
Update prompt
Sensitive-data cache review
```

Gate:

- offline state is clearly indicated;
- stale content is not presented as current without context;
- private data is not casually cached;
- updates do not strand sessions or drafts.

## Phase 10 — Quality Hardening

```txt
Accessibility audit
Core Web Vitals testing
Cross-browser testing
Visual regression suite
Motion regression and cleanup tests
SEO validation
Analytics event review
Error and observability integration
Cloudflare preview and dry-run deployment checks
```

## Workstream Ownership

```txt
Brand/design foundation
  DESIGN.md, packages/design, public art direction

Public experience
  Astro pages, custom components, content, GSAP

Admin product
  TanStack Start, app-local shadcn, operational workflows

Platform integration
  API clients, auth, Cloudflare deployment, PWA

Quality
  accessibility, performance, tests, observability
```

## Non-Goals During Foundation Work

```txt
Building a universal component library
Generating public pages from shadcn blocks
Adding WebGL before SVG/DOM techniques are proven insufficient
Creating full-screen AI video assets
Building every admin module simultaneously
Duplicating backend authorization in UI code
Choosing animation before deciding what it communicates
```

## Definition of Ready for Homepage Design

Homepage implementation starts only after:

```txt
The brand palette and fonts are integrated.
The theme modes work.
The editorial grid and content measure are tested.
The Living System storyboard is approved.
Representative project proof is available.
The opening headline and supporting message are approved.
Public API/content fixtures exist or stable mocks are available.
Reduced-motion and mobile behavior are planned.
```

## Definition of Done for a Frontend Feature

```txt
Meets the documented user purpose
Uses semantic design tokens
Works in required themes and breakpoints
Supports keyboard and assistive technology
Includes loading, empty, error, and success states where relevant
Has deliberate motion or deliberately no motion
Cleans up client behavior across navigation
Passes type, test, and build checks
Documents any new cross-application token or architecture decision
```
