# src

## Purpose

The browser application. One page, one render function, one state object, one stylesheet. Nothing here talks to Hugging Face directly and nothing here computes authoritative totals.

## Ownership

- Owns everything the visitor sees and does: markup, copy, view states, transitions, and the stylesheet
- Owns no data transformation logic. Aggregation and creator filtering live in `shared/stats-core.js`; figure copy and username rules live in `shared/`
- Consumes the `data/stats.json` and `data/models.json` shapes and must stay in sync with `update-snapshot.mjs`

## Local Contracts

### Render and state

- One `render()` call replaces `#app` with a full `innerHTML` string. There is no component tree, no virtual DOM, and no diffing
- Because the subtree is replaced on every render, event listeners are rebound inside `render()` each time. Moving a listener to module scope breaks it after the next render
- State shape: `scope` (`global` | `user`), `loading`, `error`, `validation`, `data`, `lastUpdated`. A new field belongs here and in every render branch that reads it
- `createRequestGate()` from `shared/stats-core.js` guards against out-of-order responses. Every `fetchStats` result must pass `isCurrent(requestId)` before writing state
- Every render branch that can be reached by a user must be designed. The full matrix: no-JS fallback, global loading, global loaded, creator loading, creator results, creator empty result, degraded upstream error, failed lookup, invalid username, reduced motion
- Entrance animation runs once. Later renders land immediately, so a scope change never replays the opening and no section can be stranded at `opacity: 0` when the observer misses a frame

### No simulated telemetry

- The page may not synthesize per-second arrivals, project a total forward, or draw a chart of invented events. Every figure is the published data file total, or the dated snapshot when the data files are unavailable
- The pace line is the 30-day total divided by the window, labelled as a 30-day average. It is arithmetic on sourced data, never a live reading
- Under `prefers-reduced-motion: reduce`, Lenis smooth scroll and the reveal animations stay off. Each guard is independent on purpose

### Data loading

- The global view fetches `data/stats.json` with `cache: "no-cache"`
- Creator lookup lazily fetches `data/models.json` once per page and filters it with `filterCreatorModels`. There is no server call
- A failed model fetch resets the cached promise so the retry button can try again
- The data files are committed by `update-snapshot.mjs`; the browser never talks to Hugging Face directly

### Copy and escaping

- Every interpolated user-supplied value goes through `escapeHtml()`. Usernames come from the URL and the form
- Leave the field blank in the lookup form to return to the global index. That is the documented way out of a creator view, not just an empty-input edge case

### The published snapshot

- `fallback` and `fallbackAsOf` sit inside the `// snapshot:start` and `// snapshot:end` markers and are rewritten by `update-snapshot.mjs`. Never edit the numbers by hand
- `fallbackAsOf` is what makes a stale snapshot honest. A degraded view shows `snapshot <date>` rather than a relative "now", because that is what the numbers on screen actually are
- The same figures appear in `index.html` behind `<!-- snapshot:* -->` markers, in `public/data/stats.json`, and in the model list. Nothing at runtime keeps the copies in step; `test/snapshot.test.js` does

### Styles

- `style.css` is native CSS with no preprocessor, no utility framework, and no build step beyond Vite bundling it
- Design tokens are declared once in `:root`. `DESIGN.md` is the binding source of truth for palette, type scale, and named rules; `:root` mirrors it. If they disagree, `DESIGN.md` wins and `:root` is the bug
- Named rules from `DESIGN.md` (the One Phosphor Rule, the Contrast Floor, the Tabular Numeral Rule, the No-Kicker Rule, the Sourced Figure Rule, the Instrument Flat Rule) are contracts, not suggestions
- Every text token must measure 4.5:1 or better against both `--ground` and `--panel`. Recompute before changing one
- Every changing or comparing number uses `font-variant-numeric: tabular-nums`
- Breakpoints are 1100px, 900px, 560px, and 380px. Each one has a job; do not add a fifth without a layout that needs it
- A fractional grid column holding a short value leaves a dead canyon between the value and whatever follows it. Value columns are `auto`, notes take the remaining space

### Honesty contracts

- The provenance note is not optional copy. It states that all-time downloads are summed from public Hugging Face metadata and refreshed every 12 hours
- A degraded lookup must fall back to global scope. Attaching a creator's name to the published global snapshot would be a lie
- A failed lookup must not claim "no models found". It did not check, so it says so and offers a retry
- The figure label changes to "All-time downloads · last published" in the degraded state
- The unique-creator row is global-scope only. A creator view is a single publisher, so the row is omitted there. The count comes from `totals.creatorCount`, which is present in the published snapshot too, so the degraded view keeps showing it

## Work Guidance

- Change one variable at a time from the root tokens down. Do not restyle an element locally when the token is the real problem
- Preserve the two-step hierarchy: one visual protagonist per view. The figure plate owns the global view, the ranked rows own the creator view
- When adding a state, add it to the matrix above and screenshot it before calling it done
- Reskin and restructure are allowed. Changing what the numbers mean, what the caption claims, or which scope a total belongs to is not

## Verification

- `npm test`
- `node --check src/main.js`
- `npm run build`
- Visual check: render at 390, 768, 1280, and 1600 wide, plus 200 percent zoom on the dense regions. Keyboard-only pass through the lookup form. Reduced-motion pass on Lenis smooth scroll and the reveal animations
- Contrast check: recompute the text-token ratios against `--ground` and `--panel` after any palette change
- Every state in the matrix above must be screenshotted, not assumed. Lenis smooth scroll invalidates synthetic click coordinates in screenshot harnesses, so drive the form with real DOM events (`requestSubmit`) rather than a click at pixel coordinates

## Child DOX Index

None. `src/` is a leaf.