# .github

## Purpose

Repository automation. Two workflows: verification on push and pull requests, and refreshing the published snapshot so the static HTML never serves a stale figure to a crawler.

## Ownership

- `workflows/ci.yml` owns the push and pull-request gate: install, test, build, and syntax checks. It publishes nothing
- `workflows/update-snapshot.yml` owns the schedule and the commit that keeps `index.html`, `src/main.js`, and `public/sitemap.xml` in step with the live API, including the unique-creator count
- Owns no application code and no build. The snapshot workflow calls `update-snapshot.mjs` at the repository root and commits its output
- Depends on nothing secret. `/api/stats` is public, so the snapshot workflow needs only `contents: write`

## Local Contracts

- The verify workflow runs `npm test` and `npm run build` on every push to `main` and every pull request. It is the gate that catches an API shape change reaching `src/` without the tests or snapshot moving with it
- The scheduled run must be idempotent. `update-snapshot.mjs` writes no file when the upstream snapshot has not changed, so an unchanged run produces no commit
- The schedule matches the API's own 12-hour cache. Running more often fetches the same cached value and achieves nothing
- The drift guard runs before the commit. If `index.html` and `src/main.js` ever disagree about the published figures, the workflow fails instead of committing the disagreement
- `test/snapshot.test.js` enforces a maximum snapshot age and checks the creator count is a positive number no larger than the model count. That test is the alarm for this automation dying, because GitHub disables scheduled workflows after 60 days of repository inactivity and a revoked token fails quietly

## Work Guidance

- Commit only `index.html` and `src/main.js`. The workflow stages by path so it can never sweep an unrelated working-tree change into an automated commit
- Use `workflow_dispatch` to force a refresh when the API or the format changes
- If the schedule is ever changed, update the age tolerance in `test/snapshot.test.js` with it, or the guard becomes noise

## Verification

- Run the workflow's steps locally before pushing a change to it:

```bash
node update-snapshot.mjs --dry-run
node update-snapshot.mjs
node --test test/snapshot.test.js
```

- Confirm the second `update-snapshot.mjs` run reports `already current` and writes nothing

## Child DOX Index

None. `.github/` is a leaf.