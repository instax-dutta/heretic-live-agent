# Heretic / Live

Heretic Live is a small Vite site that reads public Hugging Face metadata and shows the reach of Heretic models. It includes a global index and a creator lookup ranked by lifetime downloads.

## Local development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

This project is configured for Vercel:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Serverless API: `api/stats.js`

Import this GitHub repository into Vercel. No environment variables are required. The API reads public Hugging Face Hub metadata and uses a published fallback snapshot when the upstream service is unavailable.

## Data methodology

Models are discovered through both the `heretic` tag and `heretic` in the model name. Repository IDs are deduplicated before totals are calculated. See the [methodology reference](https://github.com/p-e-w/heretic/issues/450).

## License

No license has been declared for this repository yet.
