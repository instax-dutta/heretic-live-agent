# Heretic Live

Heretic Live is a public observability interface for the Heretic model ecosystem on Hugging Face. It aggregates public repository metadata into a global reach index and provides ranked creator-level model results without requiring authentication.

## Features

- Global all-time download totals with a live ticker: whole-download arrivals sampled per second from the rolling 30-day pace
- Rolling 30-day download totals
- Creator-scoped figure labels: lookups re-caption the figure to the creator so user totals are never presented as global
- Lenis smooth scrolling (skipped under reduced-motion preferences)
- Total indexed model count
- Creator lookup by Hugging Face username
- Ranked creator model results with lifetime and recent downloads
- Discovery through both the `heretic` tag and model names
- Cross-query deduplication by repository ID
- Cursor-paginated Hugging Face API reads
- Published fallback values when the upstream API is unavailable
- Responsive, keyboard-accessible interface

## Architecture

The project is intentionally small and dependency-light:

- **Frontend:** Vite, vanilla JavaScript, and native CSS
- **API:** Vercel serverless function at `api/stats.js`
- **Data source:** Public Hugging Face Hub model metadata
- **Hosting:** Vercel
- **Tests:** Node.js built-in test runner

The browser calls the serverless API rather than Hugging Face directly. This keeps upstream requests centralized and allows the application to apply caching, pagination, filtering, deduplication, and degraded-data handling in one place.

## Requirements

- Node.js 20.19+ or Node.js 22.12+
- npm

## Local development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal. The frontend can be developed independently, but creator lookup requests require a deployment-compatible environment that serves `api/stats.js`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Node.js regression suite |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production bundle locally |

## Data methodology

The API performs two Hugging Face model searches:

1. Repositories carrying the `heretic` tag
2. Repositories whose model name contains `heretic`

Both searches follow Hugging Face cursor pagination up to a bounded safety limit. Results are merged and deduplicated by repository ID before totals are calculated. Creator results are sorted by lifetime downloads.

The methodology is based on the public Heretic discussion and reference material available in [p-e-w/heretic issue #450](https://github.com/p-e-w/heretic/issues/450).

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

`HEAD` is supported and returns the same status and headers as `GET` with no body. `OPTIONS` answers preflight with `204 No Content`. Any other method returns `405`.

Usernames may contain letters, numbers, periods, underscores, and hyphens, with a maximum length of 96 characters. The API returns public metadata only and does not access private repositories or require credentials.

The API sets a 12-hour shared cache with stale-while-revalidate behavior. It supports cross-origin browser requests, returns CORS headers on normal and error responses, and answers `OPTIONS` preflight requests with `204 No Content`. If Hugging Face is unavailable, it returns an explicit degraded-data response while the frontend displays its published fallback snapshot.

## Verification

Run the complete local verification workflow before opening a pull request or deploying:

```bash
npm test
npm run build
node --check src/main.js
node --check api/stats.js
node --check api/stats-core.js
npm audit --audit-level=high
```

The tests cover pagination, expansion parameters, deduplication, ranking, aggregate totals, live-rate estimation, discrete-arrival sampling, figure scope labels, username validation, stale-request protection, cache policy, HTTP method handling, and CORS preflight behavior.

## Deployment to Vercel

The repository includes `vercel.json` with the required settings:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Serverless function: `api/stats.js`

To deploy:

1. Import the GitHub repository into Vercel.
2. Keep the detected Vite framework preset.
3. Confirm the build command and output directory match the settings above.
4. Deploy.

No environment variables are required for the current public-data implementation.

## Search and AI discoverability

The site includes a lightweight crawlability and social-sharing layer:

- `public/robots.txt` permits indexing and references the sitemap.
- `public/sitemap.xml` exposes the canonical homepage URL. Its `lastmod` is driven by the snapshot date, because the published figures move twice a day and a frozen `lastmod` would contradict that.
- `public/llms.txt` summarizes the product, data methodology, API, limitations, and provenance for AI systems. `index.html` links it with `rel="alternate"`.
- `index.html` includes canonical, Open Graph, Twitter card, and JSON-LD metadata.
- The methodology prose, the entity disclaimer, and the outbound links exist in **both** `index.html` and `src/main.js`. The static fallback is discarded the moment JavaScript runs, so a link that lives only in the fallback is a link no visitor and no rendering crawler sees.
- `/api/stats` is linked from the page as the authoritative machine-readable surface.
- `public/og-image.png` provides the compatible 1200×630 raster social preview asset.
- `public/og-image.svg` is the editable source artwork for the PNG preview.

The social metadata points to the PNG because Discord, WhatsApp, and some other link unfurlers do not reliably render SVG Open Graph images.

### Social preview artwork

`og-image.svg` is the single source of truth and `og-image.png` is rendered from it, so the two always agree.

The card follows the current design system in `DESIGN.md`: near-black ground, phosphor amber, Space Grotesk for the statement, IBM Plex Mono for labels, and Spectral italic for the estimator note. Space Grotesk, IBM Plex Mono, and Spectral are embedded in the SVG as base64 WOFF2 so the artwork renders identically in any browser without a network font request.

**The card carries no hardcoded totals.** The live figures refresh every 12 hours, and a link preview is the most screenshotted and most believed surface on the site, so any number baked into this artwork is a number that will go stale. The hero is the arrival strip instead: seeded Poisson draws around the real 30-day mean rate, shaped exactly as `sampleDownloadEvents` in `api/stats-core.js` shapes them. The instrument is the product's identity and never goes out of date. `og:image:alt` describes what the card actually shows.

Provenance: the SVG was authored by hand to the design system above. The PNG was rendered from that SVG by headless Google Chrome at 1200×630, which resolves the embedded webfonts exactly as a browser would. No external image-generation service was used, and no Antigravity-generated asset is claimed.

## Keeping the published figures current

The homepage is a static build, but it publishes download totals that change every 12 hours. A crawler reading the served HTML sees those figures and nothing else, so if they are never refreshed the site serves a wrong number to every AI agent that reads it.

`update-snapshot.mjs` fetches `/api/stats` and rewrites the figures in two places:

- `index.html`, inside `<!-- snapshot:* -->` marker pairs, so the served HTML carries the same numbers
- `src/main.js`, between the `// snapshot:start` and `// snapshot:end` markers, as the client-side fallback used when the upstream API is unreachable

```bash
node update-snapshot.mjs --dry-run   # report what would change, write nothing
node update-snapshot.mjs             # write the snapshot
node update-snapshot.mjs --api <url> # point at a different deployment
```

The script is idempotent: when the upstream snapshot has not changed it writes no file, so a scheduled run produces no empty commit. It exits non-zero on any upstream problem rather than leaving yesterday's figures quietly in place, and it refuses to move the published figures backwards if the upstream cache hands back an older snapshot.

`.github/workflows/update-snapshot.yml` runs it twice a day, matching the API's own 12-hour cache, and commits only when something changed. It needs no secrets; `/api/stats` is public, so the workflow requires only `contents: write`.

Two guards back this up:

- `test/snapshot.test.js` fails if `index.html` and `src/main.js` ever publish different figures, if the derived recent-share does not match the published numbers, or if the snapshot carries no date
- The same suite fails if the snapshot is older than 30 days. This is the alarm for automation that has stopped: GitHub disables scheduled workflows after 60 days of repository inactivity, and a revoked token fails quietly. Without that check a dead job would look exactly like a healthy page

Every published figure is dated in the markup, so a snapshot that does go stale reads as dated rather than as current.

## Repository hygiene

Generated dependencies and build output are excluded from version control. Do not commit `.env` files, credentials, or private Hugging Face data.

## License

No open-source license has been declared for this repository.
