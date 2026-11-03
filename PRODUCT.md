# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite 7.3.6, vanilla JavaScript, native CSS, and static JSON data built by GitHub Actions.

## Users

Hugging Face creators, model evaluators, and members of the Heretic community who need a fast public read on model adoption and distribution.

## Product Purpose

Heretic Live turns public Hugging Face metadata into a public index of Heretic model reach. Success means a visitor can understand the current scale of the ecosystem and inspect a creator's public Heretic models without logging in.

## Positioning

Heretic Live counts repositories through both the `heretic` tag and model names, then deduplicates them. This makes the long tail visible instead of reporting only the most obvious repositories.

## Operating Context

The application reads public Hugging Face Hub metadata through a build-time snapshot that a scheduled GitHub Actions workflow refreshes twice a day. The global view shows aggregate download intelligence; the creator lookup shows a ranked readout for one public username. Data is refreshed periodically and remains usable through a published fallback snapshot when the data files are unavailable.

## Capabilities and Constraints

- Global all-time downloads, recent 30-day downloads, model count, and unique creator count.
- Creator lookup by Hugging Face username.
- Ranked creator model results with lifetime and recent download signals.
- Tag-plus-name discovery, cursor pagination, deduplication, and a degraded-data state.
- Public metadata only; no authentication or private repository access.
- The current implementation is a single-page Vite application with one global view and one dynamic creator view.

## Brand Commitments

- Product name: Heretic / Live.
- Voice: direct, technical, and unsentimental.
- The interface must make public model activity legible without requiring an account.
- Preserve the existing factual copy, methodology, and Hugging Face attribution unless a later product decision changes them.

## Evidence on Hand

- Existing UI and interaction implementation in `index.html`, `src/main.js`, and `src/style.css`.
- Public-data aggregation in `shared/stats-core.js`, the refresh script in `update-snapshot.mjs`, and the client-side creator filter in `src/main.js`.
- Native regression coverage in `test/`.
- Methodology reference: https://github.com/p-e-w/heretic/issues/450
- No customer testimonials, paid claims, or private usage data are available.

## Product Principles

1. Make the scale and movement of the ecosystem immediately visible.
2. Treat public metadata as evidence, not decoration.
3. Keep lookup and reading paths fast, direct, and usable without an account.
4. Make degraded data states explicit without hiding the last useful signal.
5. Let the interface feel like an instrument for observing a public model ecosystem, with every figure sourced and dated.

## Accessibility & Inclusion

The application should remain usable with keyboard navigation, visible focus states, responsive layouts, semantic controls, and reduced-motion preferences.
