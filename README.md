# Heretic Live

Heretic Live is a public index of the Heretic model ecosystem on Hugging Face. It reads public repository metadata and turns it into a global reach index, plus ranked results for a single creator. No account is needed.

## Features

- All-time download totals, summed from public Hub metadata and refreshed every 12 hours
- Rolling 30-day download totals
- Total indexed model count
- Unique creator count across the indexed repositories
- Creator lookup by Hugging Face username
- Ranked creator results with lifetime and recent downloads
- Discovery through both the `heretic` tag and model names
- Deduplication by repository ID across both searches
- Cursor-paginated Hugging Face API reads
- Published fallback values when the data files are unavailable
- Creator-scoped figure labels, so a creator's total is never shown under the global caption
- Lenis smooth scrolling, skipped when the reader asks for reduced motion
- Keyboard-accessible, responsive interface

## Architecture

The project is small and has few dependencies:

- Frontend: Vite, vanilla JavaScript, and native CSS
- Data: two JSON files built by `update-snapshot.mjs`
- Data source: public Hugging Face Hub model metadata
- Hosting: GitHub Pages
- Automation: GitHub Actions

GitHub Pages serves static files only. A scheduled workflow fetches Hugging Face, deduplicates the repositories, writes `public/data/stats.json`, `public/data/models.json`, and the per-initial shards, then commits them. The browser reads those files. Creator lookup filters the published model list locally.

## Requirements

- Node.js 20.19+ or Node.js 22.12+
- npm

## Local development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Vite prints the local URL. The data files in `public/data/` are committed, so the global view and creator lookup both work locally. Run `node update-snapshot.mjs` to refresh them.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Node.js regression suite |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally |

## Data methodology

The refresh script runs two Hugging Face model searches:

1. Repositories carrying the `heretic` tag
2. Repositories whose model name contains `heretic`

Both searches follow Hugging Face cursor pagination up to a bounded safety limit. Results are merged and deduplicated by repository ID before totals are calculated. Creator results are sorted by lifetime downloads.

The aggregate also reports the number of distinct publishing namespaces, so one creator with many repositories counts once. It reports the mean lifetime downloads per indexed model as well. That mean is in `stats.json` only and is not rendered in the interface.

The methodology comes from the public Heretic discussion and reference material in [p-e-w/heretic issue #450](https://github.com/p-e-w/heretic/issues/450).

## Data files

`public/data/stats.json` holds the global totals. `public/data/models.json` holds the complete deduplicated model list. `public/data/models/<key>.json` holds one shard per first character. All are built and committed by `update-snapshot.mjs`.

`stats.json` contains `updatedAt`, `totals`, and `source`. `models.json` and the shards contain `updatedAt` and one entry per repository with `id`, `downloads`, and `downloadsAllTime`, sorted by lifetime downloads. Creator lookup fetches only the shard for the username's first character, so it does not download the full list.

Usernames may contain letters, numbers, periods, underscores, and hyphens, up to 96 characters. The site uses public metadata only. It does not access private repositories or require credentials.

The files are refreshed every 12 hours. When they are unavailable, the page falls back to the figures published in its own HTML and JavaScript.

## Verification

Run these checks before opening a pull request or deploying:

```bash
npm test
npm run build
node --check src/main.js
node --check shared/stats-core.js
node --check update-snapshot.mjs
npm audit --audit-level=high
```

The tests cover pagination, expansion parameters, deduplication, ranking, aggregate totals, unique-creator counting, 30-day rate estimation, creator filtering, figure scope labels, username validation, stale-request protection, and static snapshot consistency.

## Deployment to GitHub Pages

The site is a static Vite build. `.github/workflows/pages.yml` builds `dist/` and deploys it with GitHub Pages.

1. In GitHub, open Settings -> Pages and set Source to GitHub Actions.
2. Add the custom domain `heretic.sdad.pro` and keep the `public/CNAME` file in the repo.
3. At the DNS provider, point `heretic` to `instax-dutta.github.io` with a CNAME record. Set it to DNS only, not proxied; a Cloudflare proxy can block GitHub's certificate check. Remove the old Vercel record.
4. In Vercel, remove the custom domain from the project and delete or disconnect the project so it stops deploying on pushes.
5. Push to `main` or run the workflow manually. GitHub Pages provisions HTTPS after DNS resolves.

The same workflow refreshes the data twice a day and deploys the refreshed build in that run. No environment variables are required.

## Search and AI discoverability

The site includes crawlability and social-sharing files:

- `public/robots.txt` permits indexing and points to the sitemap.
- `public/sitemap.xml` lists the canonical homepage URL. Its `lastmod` comes from the snapshot date, because the published figures move twice a day.
- `public/llms.txt` summarizes the product, methodology, data files, limitations, and provenance for AI systems. `index.html` links it with `rel="alternate"`.
- `index.html` carries canonical, Open Graph, Twitter card, and JSON-LD metadata.
- The methodology prose, the entity disclaimer, and the outbound links appear in both `index.html` and `src/main.js`. The static fallback disappears the moment JavaScript runs, so a link that exists only there is a link no visitor and no rendering crawler sees.
- The page links `/data/stats.json` as the machine-readable surface.
- `public/og-image.png` is the 1200×630 card used for social previews.

The social metadata points to the PNG because Discord, WhatsApp, and some other link unfurlers do not reliably render SVG Open Graph images.

### Social preview artwork

`og-image.png` is the delivered card. It was generated with an image model from a prompt based on the design system in `DESIGN.md`, then cropped and resized to 1200×630. There is no separate vector source.

The card uses the visual system: near-black ground, phosphor amber, a grotesque for the statement, a monospaced face for labels, and an italic serif for the provenance note.

The card carries no hardcoded totals. A link preview is the most screenshotted and most believed surface on the site, and any number baked into the artwork will go stale. The hero is three register labels: Models tracked, Unique creators, and Downloads. A note says every figure is summed from public Hugging Face metadata. Nothing is sampled or projected, so the card never goes stale. `og:image:alt` describes what the card shows.

Provenance: the card was generated externally with an image model, then cropped and resized to 1200×630. No totals are baked into the artwork.

## Keeping the published figures current

The homepage is a static build, but it publishes download totals and a unique-creator count that change every 12 hours. A crawler reading the served HTML sees those figures and nothing else. If they are never refreshed, the site serves a wrong number to any AI agent that reads it.

`update-snapshot.mjs` fetches Hugging Face directly and writes the published data in one pass:

- `public/data/stats.json` for the global totals
- `public/data/models.json` and the `public/data/models/` shards for the creator lookup
- `index.html`, inside `<!-- snapshot:* -->` marker pairs, so the served HTML carries the same numbers
- `src/main.js`, between the `// snapshot:start` and `// snapshot:end` markers, as the client fallback
- `public/sitemap.xml`, so its `lastmod` matches the snapshot

```bash
node update-snapshot.mjs --dry-run   # report what would change, write nothing
node update-snapshot.mjs             # write the snapshot
```

The script is idempotent. When the upstream snapshot has not changed, it writes no file, so a scheduled run produces no empty commit. It exits non-zero on any upstream problem instead of leaving yesterday's figures quietly in place. It also refuses to move the published figures backwards if the upstream cache hands back an older snapshot.

`.github/workflows/pages.yml` runs it twice a day and commits only when the data changed. It also builds and deploys the site in the same run. The workflow needs `contents: write`, `pages: write`, and `id-token: write`.

Two guards back this up:

- `test/snapshot.test.js` fails if the data files disagree with `index.html` or `src/main.js`, if the published creator count is not a positive number no larger than the model count, if the derived recent-share does not match the published numbers, or if the snapshot carries no date.
- The same suite fails if the snapshot is older than 30 days. That is the alarm for automation that has stopped. GitHub disables scheduled workflows after 60 days of repository inactivity, and a revoked token fails quietly. Without the check, a dead job would look like a healthy page.

Every published figure is dated in the markup, so a snapshot that does go stale reads as dated, not current.

## Repository hygiene

The repository excludes generated dependencies and build output from version control. Do not commit `.env` files, credentials, or private Hugging Face data.

## License

No open-source license has been declared for this repository.
