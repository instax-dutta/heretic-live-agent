# shared

## Purpose

Small pure modules that more than one runtime needs. Today: aggregation and creator filtering, the scope-aware figure copy, and the Hugging Face username rules.

## Ownership

- `stats-core.js` owns pagination, expansion parameters, tag-plus-name discovery, deduplication, ranking, aggregation, creator filtering, 30-day rate estimation, and the request gate
- `figure.js` owns the wording that keeps a creator's totals from being presented under the global caption
- `username.js` owns normalization and validation of a Hugging Face username
- Owns no rendering, no fetching, no node built-ins. These files run in the browser, in the refresh script, and in the test runner unchanged

## Local Contracts

### Aggregation

- `collectModels` deduplicates by repository ID, with the tagged pass winning, then sorts by lifetime downloads
- `aggregate` sums `downloadsAllTime` and the rolling 30-day `downloads`, counts unique creator namespaces, and rounds `meanLifetimeDownloads`
- `filterCreatorModels` matches the namespace case-insensitively, ignores a leading `@`, and keeps the input order
- `fetchAllModels` follows the Hub cursor and throws past `maxPages`; a silent truncation would understate every total

### Scope safety

- `getFigureLabels` exists to prevent one specific and expensive mistake: showing a creator's download total under a caption that reads as the global index. The module returns global captions only when `isUser` is false and no username is supplied
- The caller must pass `isUser: false` whenever the figures on screen are the global published snapshot rather than that creator's data. A degraded lookup falls back to global totals, so creator scope there would be a lie
- `captionRight` is a short scope token (`global index`, `creator view`) rendered in the dateline, not a sentence. Keep it short; it appears at every breakpoint
- The caller passes an already-formatted model count and an already-escaped username. Do not move formatting or escaping into this module

### Username rules

- `normalizeUsername` trims and strips a single leading `@`
- `isValidUsername` is `^[a-zA-Z0-9._-]{1,96}$`. The browser and the refresh script must agree, and they share this file precisely so they cannot drift
- Validation runs after normalization, never before

### Module rules

- ESM, zero dependencies, no side effects on import
- A new module earns its place here only when at least two of `src/`, `update-snapshot.mjs`, and `test/` need it. Logic used by one runtime belongs in that runtime

## Work Guidance

- Keep each module to one concern and under roughly 60 lines. If a shared module grows a second responsibility, split it or move it
- Change wording in `figure.js` as a product copy change, not a cosmetic one; it is user-visible in both scopes

## Verification

- `npm test` covers all three modules (`test/stats-core.test.js`, `test/figure.test.js`, `test/username.test.js`)
- A new module lands with its own suite in the same change

## Child DOX Index

None. `shared/` is a leaf.