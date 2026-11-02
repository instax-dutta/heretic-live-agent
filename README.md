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
- Published fallback values when the upstream API is unavailable
- Creator-scoped figure labels, so a creator's total is never shown under the global caption
- Lenis smooth scrolling, skipped when the reader asks for reduced motion
- Keyboard-accessible, responsive interface

## Architecture

The project is small and has few dependencies:

- Frontend: Vite, vanilla JavaScript, and native CSS
- API: a Vercel serverless function at `api/stats.js`
- Data source: public Hugging Face Hub model metadata
- Hosting: Vercel
- Tests: Node.js built-in test runner

The browser calls the serverless API rather than Hugging Face directly. That keeps upstream requests in one place, where the function handles caching, pagination, filtering, deduplication, and degraded-data responses.

## Requirements

- Node.js 20.19+ or Node.js 22.12+
- npm

## Local development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Vite prints the local URL. You can work on the frontend on its own, but creator lookup needs an environment that serves `api/stats.js`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Node.js regression suite |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally |

## Data methodology

The API runs two Hugging Face model searches:

1. Repositories carrying the `heretic` tag
2. Repositories whose model name contains `heretic`

Both searches follow Hugging Face cursor pagination up to a bounded safety limit. Results are merged and deduplicated by repository ID before totals are calculated. Creator results are sorted by lifetime downloads.

The aggregate also reports the number of distinct publishing namespaces, so one creator with many repositories counts once. It reports the mean lifetime downloads per indexed model as well. That mean is an API field only and is not rendered in the interface.

The methodology comes from the public Heretic discussion and reference material in [p-e-w/heretic issue #450](https://github.com/p-e-w/heretic/issues/450).

## API behavior

The Vercel function is available at `/api/stats`.

### Global index

```text
GET /api/stats
```

### Creator lookup

```text
GET /api/stats?username=<hugging-face-username>
```

`HEAD` returns the same status and headers as `GET`, with no body. `OPTIONS` answers preflight with `204 No Content`. Any other method returns `405`.

Usernames may contain letters, numbers, periods, underscores, and hyphens, up to 96 characters. The API returns public metadata only. It does not access private repositories or require credentials.

The API sets a 12-hour shared cache with stale-while-revalidate behavior. It returns CORS headers on normal and error responses and falls back to an explicit degraded-data response when Hugging Face is unavailable. In that case the frontend shows its published fallback snapshot.

## Verification

Run these checks before opening a pull request or deploying:

```bash
npm test
npm run build
node --check src/main.js
node --check api/stats.js
node --check api/stats-core.js
npm audit --audit-level=high
```

The tests cover pagination, expansion parameters, deduplication, ranking, aggregate totals, unique-creator counting, 30-day rate estimation, figure scope labels, username validation, stale-request protection, cache policy, HTTP method handling, and CORS preflight behavior.

## Deployment to Vercel

The repository includes `vercel.json` with these settings:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Serverless function: `api/stats.js`

To deploy:

1. Import the GitHub repository into Vercel.
2. Keep the detected Vite preset.
3. Check the build command and output directory against the settings above.
4. Deploy.

No environment variables are required for the current public-data implementation.

## Search and AI discoverability

The site includes crawlability and social-sharing files:

- `public/robots.txt` permits indexing and points to the sitemap.
- `public/sitemap.xml` lists the canonical homepage URL. Its `lastmod` comes from the snapshot date, because the published figures move twice a day.
- `public/llms.txt` summarizes the product, methodology, API, limitations, and provenance for AI systems. `index.html` links it with `rel="alternate"`.
- `index.html` carries canonical, Open Graph, Twitter card, and JSON-LD metadata.
- The methodology prose, the entity disclaimer, and the outbound links appear in both `index.html` and `src/main.js`. The static fallback disappears the moment JavaScript runs, so a link that exists only there is a link no visitor and no rendering crawler sees.
- The page links `/api/stats` as the authoritative machine-readable surface.
- `public/og-image.png` is the compatible 1200×630 raster for social previews.
- `public/og-image.svg` is the editable source for that PNG.

The social metadata points to the PNG because Discord, WhatsApp, and some other link unfurlers do not reliably render SVG Open Graph images.

### Social preview artwork

`og-image.svg` is the source of truth. The PNG is rendered from it, so the two stay in step.

The card follows the design system in `DESIGN.md`: near-black ground, phosphor amber, Space Grotesk for the statement, IBM Plex Mono for labels, and Spectral italic for the provenance note. The SVG embeds Space Grotesk, IBM Plex Mono, and Spectral as base64 WOFF2, so it renders the same in any browser without a network font request.

The card carries no hardcoded totals. A link preview is the most screenshotted and most believed surface on the site, and any number baked into the artwork will go stale. The hero is three register labels: Models tracked, Unique creators, and Downloads. A note says every figure is summed from public Hugging Face metadata. Nothing is sampled or projected, so the card never goes stale. `og:image:alt` describes what the card shows.

Provenance: the SVG was authored by hand to the design system above. The PNG was rendered from that SVG by headless Google Chrome at 1200×630, which resolves the embedded webfonts exactly as a browser would. No external image-generation service was used, and no Antigravity-generated asset is claimed.

## Keeping the published figures current

The homepage is a static build, but it publishes download totals and a unique-creator count that change every 12 hours. A crawler reading the served HTML sees those figures and nothing else. If they are never refreshed, the site serves a wrong number to any AI agent that reads it.

`update-snapshot.mjs` fetches `/api/stats` and rewrites the figures in two places:

- `index.html`, inside `<!-- snapshot:* -->` marker pairs, so the served HTML carries the same numbers
- `src/main.js`, between the `// snapshot:start` and `// snapshot:end` markers, as the client fallback used when the upstream API is unreachable

```bash
node update-snapshot.mjs --dry-run   # report what would change, write nothing
node update-snapshot.mjs             # write the snapshot
node update-snapshot.mjs --api <url> # point at a different deployment
```

The script is idempotent. When the upstream snapshot has not changed, it writes no file, so a scheduled run produces no empty commit. It exits non-zero on any upstream problem instead of leaving yesterday's figures quietly in place. It also refuses to move the published figures backwards if the upstream cache hands back an older snapshot.

`.github/workflows/update-snapshot.yml` runs it twice a day, matching the API's own 12-hour cache, and commits only when something changed. It needs no secrets. `/api/stats` is public, so the workflow requires only `contents: write`.

Two guards back this up:

- `test/snapshot.test.js` fails if `index.html` and `src/main.js` ever publish different figures, if the published creator count is not a positive number no larger than the model count, if the derived recent-share does not match the published numbers, or if the snapshot carries no date.
- The same suite fails if the snapshot is older than 30 days. That is the alarm for automation that has stopped. GitHub disables scheduled workflows after 60 days of repository inactivity, and a revoked token fails quietly. Without the check, a dead job would look like a healthy page.

Every published figure is dated in the markup, so a snapshot that does go stale reads as dated, not current.

## Repository hygiene

The repository excludes generated dependencies and build output from version control. Do not commit `.env` files, credentials, or private Hugging Face data.

## License

No open-source license has been declared for this repository.
