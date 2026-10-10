# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## Project

Heretic Live is a single-page public observability interface for the Heretic model ecosystem on Hugging Face. It turns public Hub metadata into a global reach index plus a per-creator lookup. There is one route and one page; the page has two scopes.

### Global rails

- Factual copy, methodology, and Hugging Face attribution are product commitments. Do not rewrite them for tone, length, or layout.
- Reskin and restructure freely. Do not change the API response shape, the live-rate math, or the state machine without updating `api/`, `shared/`, and `test/` in the same change.
- Public Hugging Face metadata only. No authentication, no private repositories, no secrets, no environment variables.
- Heretic Live is an unaffiliated third-party observer of the upstream project, not an official surface of it. The methodology, the disclaimer, and the provenance links must appear in both `index.html` and `src/main.js`, because the static fallback is discarded the moment JavaScript runs.
- The live total is a rate estimate extrapolated from the 30-day mean, not a measurement. Copy must never imply otherwise.
- The static HTML publishes figures a crawler reads without JavaScript. Those figures are machine-owned: edit them through `update-snapshot.mjs` or the snapshot markers, never by hand. `test/snapshot.test.js` fails if the two copies disagree or the snapshot goes stale.
- Keep keyboard navigation, visible focus, responsive layout, and `prefers-reduced-motion` behavior working on every change.
- The dependency list is deliberately tiny (`vite`, `lenis`). Do not add a dependency without a stated need.
- Never commit `.env` files, credentials, or private Hugging Face data.

### Top-level layout

| Path | Scope |
| --- | --- |
| `index.html` | App shell plus the SEO, Open Graph, Twitter, JSON-LD, and no-JavaScript head and fallback copy |
| `package.json` | Scripts, ESM mode, dependency and devDependency declarations |
| `vercel.json` | Vercel framework preset, build command, output directory, function duration |
| `PRODUCT.md` | Product purpose, users, positioning, capabilities, brand commitments |
| `DESIGN.md` | Binding design system contract: north star, palette, typography, layout, components |
| `README.md` | Human-facing setup, architecture, API behavior, deployment, and verification documentation |
| `api/` | Vercel serverless handler and the pure aggregation core |
| `shared/` | Pure modules imported by both the browser and the tests |
| `src/` | Browser application: render, state, live ticker, styles |
| `test/` | Node built-in test runner regression suites |
| `public/` | Files served verbatim at the site root |
| `.impeccable/` | Generated design-system extraction owned by the impeccable tooling. Regenerate through that tool; do not hand-edit |
| `.github/` | Scheduled automation, currently the published-snapshot refresh |

## User Preferences

- No emojis in docs, code, comments, or UI copy
- Use dashes, not em dashes
- Prefer fixing a problem at its source over layering a patch on top of it
- Keep changes scoped to the request; do not mix unrelated refactors into visual or feature work

## Child DOX Index

- `api/AGENTS.md` — serverless handler, Hugging Face IO, pagination, dedup, aggregation, cache and CORS policy
- `shared/AGENTS.md` — runtime-agnostic pure modules: figure copy and username rules
- `src/AGENTS.md` — browser application: single-render page, state machine, live ticker, styles
- `test/AGENTS.md` — Node built-in test runner suites and their coverage contract
- `.github/AGENTS.md` — scheduled refresh of the published snapshot
- `public/AGENTS.md` — static assets served at the site root, including social and crawler files