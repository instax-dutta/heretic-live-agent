# Heretic Live

Heretic Live is a public observability interface for the Heretic model ecosystem on Hugging Face. It aggregates public repository metadata into a global reach index and provides ranked creator-level model results without requiring authentication.

## Features

- Global all-time download totals
- Rolling 30-day download totals
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

Usernames may contain letters, numbers, periods, underscores, and hyphens, with a maximum length of 96 characters. The API returns public metadata only and does not access private repositories or require credentials.

The API sets a five-minute shared cache with stale-while-revalidate behavior. If Hugging Face is unavailable, it returns an explicit degraded-data response while the frontend displays its published fallback snapshot.

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

The tests cover pagination, expansion parameters, deduplication, ranking, aggregate totals, username validation, and stale-request protection.

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
- `public/sitemap.xml` exposes the canonical homepage URL.
- `public/llms.txt` summarizes the product, data methodology, API, and limitations for AI systems.
- `index.html` includes canonical, Open Graph, Twitter card, and JSON-LD metadata.
- `public/og-image.svg` provides the branded 1200×630 social preview asset.

The OG image uses the existing Heretic Live visual system as a dependency-free SVG fallback. The requested Antigravity CLI was not available in the build environment, so no Antigravity-generated asset is claimed.

## Repository hygiene

Generated dependencies and build output are excluded from version control. Do not commit `.env` files, credentials, or private Hugging Face data.

## License

No open-source license has been declared for this repository.
