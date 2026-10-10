# shared

## Purpose

Small pure modules that more than one runtime needs. Today: the scope-aware figure copy and the Hugging Face username rules.

## Ownership

- `figure.js` owns the wording that keeps a creator's totals from being presented under the global caption
- `username.js` owns normalization and validation of a Hugging Face username
- Owns no rendering, no fetching, no node built-ins. These files run in the browser, in the serverless function, and in the test runner unchanged

## Local Contracts

### Scope safety

- `getFigureLabels` exists to prevent one specific and expensive mistake: showing a creator's download total under a caption that reads as the global index. The module returns global captions only when `isUser` is false and no username is supplied
- The caller must pass `isUser: false` whenever the figures on screen are the global published snapshot rather than that creator's data. A degraded lookup falls back to global totals, so creator scope there would be a lie
- `captionRight` is a short scope token (`global index`, `creator view`) rendered in the dateline, not a sentence. Keep it short; it appears at every breakpoint
- The caller passes an already-formatted model count and an already-escaped username. Do not move formatting or escaping into this module

### Username rules

- `normalizeUsername` trims and strips a single leading `@`
- `isValidUsername` is `^[a-zA-Z0-9._-]{1,96}$`. The browser and the API must agree, and they share this file precisely so they cannot drift
- Validation runs after normalization, never before

### Module rules

- ESM, zero dependencies, no side effects on import
- A new module earns its place here only when at least two of `src/`, `api/`, and `test/` need it. Logic used by one runtime belongs in that runtime

## Work Guidance

- Keep each module to one concern and under roughly 60 lines. If a shared module grows a second responsibility, split it or move it
- Change wording in `figure.js` as a product copy change, not a cosmetic one; it is user-visible in both scopes

## Verification

- `npm test` covers both modules (`test/figure.test.js`, `test/username.test.js`)
- A new module lands with its own suite in the same change

## Child DOX Index

None. `shared/` is a leaf.