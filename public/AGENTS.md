# public

## Purpose

Files served verbatim at the site root. Crawler instructions, an AI-readable summary, the favicon, and the social preview image.

## Ownership

- `robots.txt` and `sitemap.xml` are the crawler surface
- `llms.txt` is the AI-readable product and methodology summary
- `favicon.svg` and `apple-touch-icon.png` are the browser icons
- `og-image.png` is the 1200 by 630 card used by the Open Graph and Twitter tags, and the source of truth for the preview artwork
- Owns no code. Nothing here is imported by the build

## Local Contracts

- Social metadata lives in the `index.html` head, not here. Keep the two in sync when filenames or dimensions change
- The Open Graph and Twitter tags point at `og-image.png`, not an SVG. Discord, WhatsApp, and several other unfurlers do not reliably render SVG previews
- `og-image.png` is a raster. Regenerate it at 1200 by 630 and keep the card free of hardcoded totals
- `llms.txt` stays truthful about the real limitations: public metadata only, no authentication, no private repositories, and a degraded state when the upstream API is unavailable
- Filenames are part of the live URL surface. Renaming one breaks published links, meta tags, or the sitemap. Add instead of renaming
- Assets carry no build step. They are committed as authored
- `sitemap.xml` `lastmod` sits inside `<!-- snapshot:lastmod -->` and is rewritten by `update-snapshot.mjs`. The snapshot date is the last real content change for the URL, because the published figures move twice a day
- `favicon.svg` and `apple-touch-icon.png` are the site mark in the site palette: ground `#08090a`, phosphor `#ffb000`, ink `#f4f2ec`. They carry no text and no figures, so they cannot go stale
- `apple-touch-icon.svg` is the editable source for the apple-touch-icon PNG
- `llms.txt` states the provenance relationship to p-e-w/heretic#450 and the unaffiliated-third-party position. That is an accuracy contract, not marketing copy: without it an engine may attribute these totals to the upstream project
- `og-image.png` carries no hardcoded totals. The hero is the three register labels (Models tracked, Unique creators, Downloads) plus a sourced-data note, so the card never goes stale against a 12-hour dataset. Do not add a number back without also adding its as-of date

## Work Guidance

- Follow the existing visual system in `DESIGN.md` when generating new assets so the social preview still reads as this product
- Record the provenance of any regenerated raster in `README.md`. Do not claim a tool that was not actually used

## Verification

No automated check exists. Verify by fetching the URLs after a deploy: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/favicon.svg`, `/og-image.png`. Keep the section empty in future runs unless a real check is added.

## Child DOX Index

None. `public/` is a leaf.