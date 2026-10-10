# test

## Purpose

The regression suite. Node's built-in runner over every behavior worth breaking.

## Ownership

- Owns coverage of `api/`, `shared/`, and the pure logic behind `src/` such as rate estimation and figure labels
- Does not own the implementation. A test that reaches into `src/main.js` internals is testing something that is about to be refactored
- Does not own deployment or visual verification

## Local Contracts

- `node --test` only. No test framework, no assertion library beyond `node:assert/strict`, no mocking library
- Tests never touch the network. Upstream reads are faked; the Vercel request and response are hand-rolled objects in `stats.test.js`
- Every behavior change in `api/`, `shared/`, or the pure parts of `src/` ships with a test in the same change
- Test names state the behavior, not the function. `respects the 100 page ceiling` reads better in a failure than `fetchAllModels throws`
- Randomness is injected, never mocked globally. `sampleDownloadEvents` takes a PRNG argument so the Poisson draw is deterministic in tests
- Covered today: cursor pagination, the pagination ceiling, expansion parameter merging, tag-plus-name deduplication and ranking, aggregate totals, live rate estimation, discrete arrival sampling, figure scope labels, username normalization and validation, stale-request protection, cache policy, HTTP method handling, and CORS preflight
- The scope-safety test asserts no field stays identical to the global copy, not merely that the username appears somewhere. A weakened disjunction here is how a creator total silently becomes a global claim

## Work Guidance

- Assert on the JSON body whenever a response shape changes, not only on the status code
- A failing test means the contract moved. Decide deliberately whether the contract or the test is wrong, and say which in the commit
- Keep fakes minimal. If a fake grows branches, the function under test is doing too much

## Verification

- `npm test`
- Full closeout for a code change: `npm test`, `npm run build`, `node --check` on each `api/`, `shared/`, and `src/` module

## Child DOX Index

None. `test/` is a leaf.