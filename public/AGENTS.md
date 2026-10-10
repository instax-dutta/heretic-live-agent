# public

## Purpose

Files served verbatim at the site root. Crawler instructions, an AI-readable summary, the favicon, and the social preview images.

## Ownership

- `robots.txt` and `sitemap.xml` are the crawler surface
- `llms.txt` is the AI-readable product and methodology summary
- `favicon.svg` and `apple-touch-icon.png` are the browser icons
- `og-image.svg` is the editable source artwork; `og-image.png` is the 1200 by 630 raster the Open Graph and Twitter tags actually reference
- Owns no code. Nothing here is imported by the build

## Local Contracts

- Social metadata lives in the `index.html` head, not here. Keep the two in sync when filenames or dimensions change
- The Open Graph and Twitter tags point at `og-image.png`, not the SVG. Discord, WhatsApp, and several other unfurlers do not reliably render SVG previews
- `og-image.svg` and `og-image.png` are one asset in two formats. Change both together or the link preview drifts from the source of truth
- `llms.txt` stays truthful about the real limitations: public metadata only, no authentication, no private repositories, and a degraded state when the upstream API is unavailable
- Filenames are part of the live URL surface. Renaming one breaks published links, meta tags, or the sitemap. Add instead of renaming
- Assets carry no build step. They are committed as authored

## Work Guidance

- Follow the existing visual system in `DESIGN.md` when drawing new assets so the social preview still reads as this product
- Record the provenance of any regenerated raster in `README.md`. Do not claim a tool that was not actually used

## Verification

No automated check exists. Verify by fetching the URLs after a deploy: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/favicon.svg`, `/og-image.png`. Keep the section empty in future runs unless a real check is added.

## Child DOX Index

None. `public/` is a leaf.