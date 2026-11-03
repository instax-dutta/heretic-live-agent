# test

## Purpose

The regression suite. Node's built-in runner over every behavior worth breaking.

## Ownership

- Owns coverage of `shared/` and the published data files, plus the pure logic behind `src/` such as rate estimation and figure labels
- Does not own the implementation. A test that reaches into `src/main.js` internals is testing something that is about to be refactored
- Does not own deployment or visual verification

## Local Contracts

- `node --test` only. No test framework, no assertion library beyond `node:assert/strict`, no mocking library
- Tests never touch the network. Upstream reads are faked in the core tests
- Every behavior change in `shared/`, the data file shape, or the pure parts of `src/` ships with a test in the same change
- Test names state the behavior, not the function. `respects the 100 page ceiling` reads better in a failure than `fetchAllModels throws`
- Covered today: cursor pagination, the pagination ceiling, expansion parameter merging, tag-plus-name deduplication and ranking, aggregate totals, unique-creator counting, creator filtering, 30-day rate estimation, figure scope labels, username normalization and validation, stale-request protection, and data file agreement
- The scope-safety test asserts no field stays identical to the global copy, not merely that the username appears somewhere. A weakened disjunction here is how a creator total silently becomes a global claim
- `snapshot.test.js` guards the published figures rather than logic: `public/data/stats.json`, `public/data/models.json`, the static HTML, and the client fallback must agree, the derived share must match, and the snapshot must carry a date and be within tolerance
- The age tolerance in `snapshot.test.js` is the alarm for dead automation. Raise it only alongside the schedule in `.github/AGENTS.md`, never to silence a failure

## Work Guidance

- Assert on the JSON shape whenever a data file shape changes, not only on its presence
- A failing test means the contract moved. Decide deliberately whether the contract or the test is wrong, and say which in the commit
- Keep fakes minimal. If a fake grows branches, the function under test is doing too much

## Verification

- `npm test`
- Full closeout for a code change: `npm test`, `npm run build`, `node --check` on each `shared/` and `src/` module, plus `node --check update-snapshot.mjs`

## Child DOX Index

None. `test/` is a leaf.