# api

## Purpose

The only backend. A Vercel serverless function that turns public Hugging Face Hub model metadata into the aggregate the page reads, plus a pure aggregation core that carries the logic worth testing.

## Ownership

- `stats-core.js` owns pagination traversal, expansion parameters, tag-plus-name discovery, deduplication, ranking, aggregation, rate estimation, Poisson sampling, and the request gate
- `stats.js` owns HTTP concerns only: request method handling, CORS, cache headers, upstream timeout, status codes, and response shape
- Owns upstream failure behavior. Every failure path must resolve to something the browser can render

## Local Contracts

### Purity boundary

- `stats-core.js` performs no network, filesystem, timer, or environment access. This is what lets the whole suite run offline
- `stats.js` is the only file allowed to call `fetch`. It must not import from `src/`
- Nothing runs at module scope beyond constant declarations. Importing `api/stats.js` must have no side effects

### Discovery

- Two passes run in parallel: `filter=heretic` (tagged) and `search=heretic` (named), each sorted by downloads descending, limit 1000, cursor-paginated through the `link` header
- `withModelExpansions` merges existing `expand` and `expand[]` params into a single deduplicated `expand[]` set and always requests `downloads`, `downloadsAllTime`, and `tags`
- `fetchAllModels` follows the cursor and throws past `maxPages` (100). A silent truncation would understate every total on the page
- `collectModels` deduplicates by repository id with the tagged result winning, then sorts by `downloadsAllTime` descending. Ranking order is user-visible

### Response contract

- Success is `{ ok: true, scope, username, updatedAt, totals: { modelCount, allTimeDownloads, last30DaysDownloads }, models, source }`
- `models` is present only when a username was supplied. The global view deliberately omits it
- `username` is `null` in the global scope, never `""`
- Status codes: `204` for OPTIONS preflight, `400` for an invalid username, `405` for any non-GET method, `502` for upstream failure with a user-safe message, `200` otherwise
- CORS headers are set before any branch, including errors, so a browser never sees an opaque failure
- Cache: `s-maxage=43200, stale-while-revalidate=600`. Error and preflight responses override it with `no-store`

### Failure handling

- Upstream status codes and bodies are logged server-side only. The client gets a plain sentence, never an upstream message
- A failure returns a degraded response; it never returns partial totals with a success status

## Work Guidance

- Keep new logic in `stats-core.js` and new transport concerns in `stats.js`. If a test would need a network to cover new code, the code is in the wrong file
- Changing the response shape is a three-tree change: `api/`, `src/`, and `test/`. Do it in one commit
- Bound every upstream call. The 25 second timeout and the 100 page ceiling are deliberate limits, not defaults

## Verification

- `npm test` covers `stats-core.js` directly and `stats.js` through a fake request/response pair
- `node --check api/stats.js` and `node --check api/stats-core.js`
- A change to the shape needs a test that asserts the JSON body, not only the status code

## Child DOX Index

None. `api/` is a leaf.