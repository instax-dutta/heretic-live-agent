# src

## Purpose

The browser application. One page, one render function, one state object, one live ticker, one stylesheet. Nothing here talks to Hugging Face directly and nothing here computes authoritative totals.

## Ownership

- Owns everything the visitor sees and does: markup, copy, view states, transitions, and the stylesheet
- Owns no data transformation logic. Aggregation lives in `api/stats-core.js`, shared copy and username rules live in `shared/`
- Consumes the `/api/stats` response shape and must stay in sync with `api/AGENTS.md`

## Local Contracts

### Render and state

- One `render()` call replaces `#app` with a full `innerHTML` string. There is no component tree, no virtual DOM, and no diffing
- Because the subtree is replaced on every render, event listeners are rebound inside `render()` each time. Moving a listener to module scope breaks it after the next render
- State shape: `scope` (`global` | `user`), `loading`, `error`, `validation`, `data`, `lastUpdated`. A new field belongs here and in every render branch that reads it
- `createRequestGate()` from `api/stats-core.js` guards against out-of-order responses. Every `fetchStats` result must pass `isCurrent(requestId)` before writing state
- Every render branch that can be reached by a user must be designed. The full matrix: no-JS fallback, global loading, global loaded, creator loading, creator results, creator empty result, degraded upstream error, failed lookup, invalid username, reduced motion
- Entrance animation runs once. Later renders land immediately, so a scope change never replays the opening and no section can be stranded at `opacity: 0` when the observer misses a frame

### Live ticker

- The ticking total is a Poisson draw of whole-download arrivals from the 30-day mean rate, anchored at render time because the API total is a 12-hour snapshot. Keep the math in `api/stats-core.js`; `src/` only schedules the interval
- Restart the ticker only when the totals key (`allTimeDownloads|last30DaysDownloads|modelCount`) changes. Restarting drops accrued arrivals and makes the counter visibly jump backward
- `#live-total` carries `aria-live="off"`. A per-second announced number is hostile; do not change this
- Under `prefers-reduced-motion: reduce` the ticker, Lenis smooth scroll, and reveal animations all stay off. Each guard is independent on purpose

### Copy and escaping

- Every interpolated user-supplied value goes through `escapeHtml()`. Usernames come from the URL and the form
- Leave the field blank in the lookup form to return to the global index. That is the documented way out of a creator view, not just an empty-input edge case

### Styles

- `style.css` is native CSS with no preprocessor, no utility framework, and no build step beyond Vite bundling it
- Design tokens are declared once in `:root`. `DESIGN.md` is the binding source of truth for palette, type scale, and named rules; `:root` mirrors it. If they disagree, `DESIGN.md` wins and `:root` is the bug
- Named rules from `DESIGN.md` (the One Phosphor Rule, the Contrast Floor, the Tabular Numeral Rule, the No-Kicker Rule, the Instrument Flat Rule) are contracts, not suggestions
- Every text token must measure 4.5:1 or better against both `--ground` and `--panel`. Recompute before changing one
- Every changing or comparing number uses `font-variant-numeric: tabular-nums`
- Breakpoints are 1100px, 900px, 560px, and 380px. Each one has a job; do not add a fifth without a layout that needs it
- A fractional grid column holding a short value leaves a dead canyon between the value and whatever follows it. Value columns are `auto`, notes take the remaining space

### The arrival strip

- The strip is the design's protagonist and it is evidence, not decoration. It renders one bar per second of the same Poisson draw the figure counts
- The channel is always drawn at full width. Unfilled slots get a baseline tick so a fresh visit reads as an instrument at rest, never as a broken render during the first 90 seconds
- The left caption states the true elapsed window, not a fixed `90 s ago`, so a partly filled channel explains itself
- Scale is anchored to the mean (`max(3, ceil(rate * 2.2))`), never to the largest sample, so the mean rule never moves between sessions
- A zero-arrival second draws a flat tick. Quiet is real information; do not drop zero samples
- Do not band bars by value or add a glow. The mean rule already encodes above and below, and a soft edge on a hard-edged page reads as a fault
- `paintStrip` rebuilds the column markup. Matching children by index silently leaves a growing gap as the buffer and DOM drift apart

### Honesty contracts

- The estimator note is not optional copy. It states that the live total is an estimate, not a measurement, and that the spread is the estimator's own variance
- A degraded lookup must fall back to global scope. Attaching a creator's name to the published global snapshot would be a lie
- A failed lookup must not claim "no models found". It did not check, so it says so and offers a retry
- The figure label changes to "All-time downloads · last published" in the degraded state

## Work Guidance

- Change one variable at a time from the root tokens down. Do not restyle an element locally when the token is the real problem
- Preserve the two-step hierarchy: one visual protagonist per view. The figure plate owns the global view, the ranked rows own the creator view
- When adding a state, add it to the matrix above and screenshot it before calling it done
- Reskin and restructure are allowed. Changing what the numbers mean, what the caption claims, or which scope a total belongs to is not

## Verification

- `npm test`
- `node --check src/main.js`
- `npm run build`
- Visual check: render at 390, 768, 1280, and 1600 wide, plus 200 percent zoom on the dense regions. Keyboard-only pass through the lookup form. Reduced-motion pass on the ticker and reveal animations
- Contrast check: recompute the text-token ratios against `--ground` and `--panel` after any palette change
- Every state in the matrix above must be screenshotted, not assumed. Lenis smooth scroll invalidates synthetic click coordinates in screenshot harnesses, so drive the form with real DOM events (`requestSubmit`) rather than a click at pixel coordinates

## Child DOX Index

None. `src/` is a leaf.