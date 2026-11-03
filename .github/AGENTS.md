# .github

## Purpose

Repository automation. Two workflows: verification on push and pull requests, and the GitHub Pages build, deploy, and scheduled data refresh.

## Ownership

- `workflows/ci.yml` owns the push and pull-request gate: install, test, build, and syntax checks. It publishes nothing
- `workflows/pages.yml` owns the GitHub Pages build and deploy, plus the schedule that refreshes `public/data/stats.json`, `public/data/models.json`, `index.html`, `src/main.js`, and `public/sitemap.xml`
- Owns no application code beyond the workflow steps. `pages.yml` calls `update-snapshot.mjs` at the repository root, commits its output, then builds and deploys
- Depends on nothing secret. The Hugging Face API is public, so the workflow needs only `contents: write`, `pages: write`, and `id-token: write`

## Local Contracts

- The verify workflow runs `npm test` and `npm run build` on every push to `main` and every pull request. It is the gate that catches a data file shape change reaching `src/` without the tests or snapshot moving with it
- The scheduled run must be idempotent. `update-snapshot.mjs` reuses the previous timestamp when the model list has not changed, so an unchanged run produces no commit
- The schedule runs every 12 hours. Running more often adds upstream load without changing the published cadence
- The drift guard runs before the commit. If the data files, `index.html`, and `src/main.js` ever disagree about the published figures, the workflow fails instead of committing the disagreement
- `test/snapshot.test.js` enforces a maximum snapshot age, checks the creator count is a positive number no larger than the model count, and checks the data files agree with the inline snapshot. That test is the alarm for this automation dying, because GitHub disables scheduled workflows after 60 days of repository inactivity and a revoked token fails quietly

## Work Guidance

- Commit only the five machine-owned paths. The workflow stages by path so it can never sweep an unrelated working-tree change into an automated commit
- Use `workflow_dispatch` to force a refresh or redeploy when the data or the format changes. A commit pushed with `GITHUB_TOKEN` does not trigger another workflow, so the scheduled job builds and deploys the refreshed tree in the same run
- If the schedule is ever changed, update the age tolerance in `test/snapshot.test.js` with it, or the guard becomes noise

## Verification

- Run the workflow's steps locally before pushing a change to it:

```bash
node update-snapshot.mjs --dry-run
node update-snapshot.mjs
node --test test/snapshot.test.js
npm run build
```

- Confirm the second `update-snapshot.mjs` run reports `already current` and writes nothing

## Child DOX Index

None. `.github/` is a leaf.