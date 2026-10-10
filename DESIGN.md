---
name: Heretic Live
description: A tide gauge for an accumulating quantity. The live estimate's own variance is the hero.
colors:
  ground: "#08090a"
  panel: "#0e1012"
  panel-2: "#14171a"
  ink: "#f4f2ec"
  ink-2: "#b9bcc2"
  dim: "#969ba3"
  faint: "#7a7f87"
  rule: "#1e2126"
  rule-2: "#2a2e34"
  phos: "#ffb000"
  phos-ink: "#08090a"
  alert: "#ff5a47"
typography:
  statement:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(22px, 2.5vw, 32px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.018em"
  figure:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(46px, 9.6vw, 138px)"
    fontWeight: 700
    lineHeight: 0.86
    letterSpacing: "-0.045em"
  ledger-value:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(24px, 3.1vw, 38px)"
    fontWeight: 500
    letterSpacing: "-0.03em"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "9.5px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
  note:
    fontFamily: "Spectral, Georgia, serif"
    fontStyle: italic
    fontSize: "13.5px"
    lineHeight: 1.75
---

# Design System: Heretic Live

## Overview

**Creative North Star: "The Tide Gauge"**

Heretic Live is an instrument for watching a quantity accumulate. The page's one live signal is an estimate, not a measurement, so the design does the honest thing: it shows the estimate's variance instead of hiding it. A channel across the top records one bar per second of sampled arrivals; the 30-day mean is a dashed rule the bars fluctuate around; the cumulative figure sits below at full measure. Near-black ground, one phosphor amber, a vertical name rail. Nothing glows, nothing is a card, nothing claims to be measured.

**Key Characteristics:**
- One vertical rail carrying the name and a live status; a horizontal folio below it
- One instrument band: a 90-second channel of sampled arrivals with the mean drawn through it
- A single figure at full measure, tabular, with a marginal editorial note pinned beside it
- Register rows instead of stat cards: label, figure, and a right-aligned italic note
- Amber appears only where something is live or acts

## Colors

Near-black ground, paper-white ink, and one phosphor amber that owns everything live.

### Primary
- **Phosphor Amber** (`#ffb000`): the arrival bars, the mean rule, the live dot, focus rings, the primary action, and inline links. Amber on the ground measures 10.4:1.
- **Alert Red** (`#ff5a47`): the degraded stamp and the correction border only. Never decoration.

### Neutral
- **Ground** (`#08090a`): the page.
- **Panel** (`#0e1012`): the instrument band and the focused row.
- **Ink** (`#f4f2ec`): the figure and primary text. 17.0:1.
- **Ink 2** (`#b9bcc2`): secondary text and the scope tag. 10.0:1.
- **Dim** (`#969ba3`): labels, dateline, figure label. 6.8:1.
- **Faint** (`#7a7f87`): captions, ranks, placeholders. 4.7:1. This is the AA floor; nothing informative may go below it.
- **Rule** (`#1e2126`): hairlines and the empty channel ticks.
- **Rule 2** (`#2a2e34`): control borders.

### Named Rules
**The One Phosphor Rule.** Amber appears only where something is live or acts. A still amber element is a defect.
**The Contrast Floor.** Every text token is verified at 4.5:1 or better against both the ground and the panel. Recompute before changing any of them.

## Typography

**UI and figures:** Space Grotesk (statement, figure, register values)
**Labels and measurements:** IBM Plex Mono (dateline, captions, ranks, figures, raw readings)
**Editorial voice:** Spectral italic (estimator note, row notes, methodology prose)

**Character:** A grotesque measures, a mono labels, a serif editorialises. The serif is reserved for prose that explains a judgement; it never labels anything.

### Hierarchy
- **Statement** (Space Grotesk 500, clamp(22px, 2.5vw, 32px), 1.1): the question only.
- **Figure** (Space Grotesk 700, clamp(46px, 9.6vw, 138px), 0.86, tabular): the live total. A figure, not a heading.
- **Register value** (Space Grotesk 500, clamp(24px, 3.1vw, 38px), tabular): the three ledger figures.
- **Section head** (Space Grotesk 500, clamp(19px, 2vw, 25px)).
- **Body** (Space Grotesk 400, 13.5px, 1.6): interface prose.
- **Note** (Spectral italic, 13.5px, 1.75): editorial asides and methodology.
- **Label** (IBM Plex Mono 500, 9.5px, +0.16em, uppercase): dateline, figure label, strip captions, form labels, ranks.

### Named Rules
**The Tabular Numeral Rule.** Every number that changes or compares is tabular. A jittering figure is a defect.
**The No-Kicker Rule.** Headings carry their own weight. No eyebrow label above a heading, ever.
**The Serif Is Not A Label.** Spectral is a voice, never a label. A serif heading or caption is a defect.

## Layout

A 1560px sheet: a 46px vertical rail plus a content column. The rail collapses to a horizontal folio below 900px. Reading order: folio and statement -> instrument band -> figure and estimator note -> register rows -> lookup -> results or methods -> imprint. Section breaks are hairlines; the register and the lookup carry a brighter `--ink-2` rule because they open a section. Spacing rhythm: tight groups (12–18px), generous separations (26–46px).

Breakpoints are 1100px (register and methods tighten), 900px (rail collapses, single-column figure and lookup, rows stack), 560px (form stacks, model rows collapse to two lines), 380px (the figure shrinks further).

## Elevation & Depth

No shadows anywhere, including on the live bar. Depth comes from paper tone steps (ground -> panel) and rule weight. Flat by principle.

### Named Rules
**The Instrument Flat Rule.** Nothing floats, nothing glows. A soft blur on an otherwise hard-edged page reads as a rendering fault.

## Shapes

Zero radius on every surface, box, and control. The only circles are the live dot and the dead man's glyph in the empty state. Rules do the shaping.

## Components

### Arrival strip (the instrument band)
A bordered panel holding a full-width 90-slot channel. Unfilled slots render a 2px baseline tick so the channel reads as an instrument at rest rather than as a broken render during the first 90 seconds. Filled slots draw an amber bar; the newest sample is paper-white with no glow. A dashed vertical rule with a square cap marks the 30-day mean.

The vertical scale is anchored to the mean, `max(3, ceil(rate * 2.2))`, not to the largest sample, so the mean rule never moves and above/below-average seconds stay comparable across sessions and scopes. A zero-arrival second draws a flat 2px tick: quiet is real information. The left caption reads the true elapsed window (`12 s ago`, then `90 s ago`) so a partly filled channel explains itself.

### Figure
The figure label, the tabular total, the pace line, and the sub-line, with the estimator note pinned to the right behind a hairline rule. The note states the estimate is not a measurement and that the spread is the estimator's own variance. It is not optional copy.

### Register rows
`label | figure | note` on a hairline. The figure column is `auto`, not a fraction: a fractional value column leaves a dead canyon between the number and the note.

### Lookup
A 1px `--ink-2` box on panel that shifts to amber on focus-within; amber mono `@` sigil; amber caret; the primary action is a solid amber block with ink text.

### Buttons
Square, no radius. Primary: amber fill, ink text, 48–50px tall. Hover inverts to ink fill with paper text. Press scales to 0.98. Focus: 2px amber outline, 3px offset.

### Model rows
Anchor-addressable ledger rows: rank, name and mono id, magnitude bar, tabular total with the 30-day figure beneath it, and an outbound arrow. Hovering the list dims siblings to 45% while the hovered row takes the panel ground. Rows deploy in a short staged sequence on arrival, motion-safe only.

### Degraded state
A correction box in alert red with an inline retry. The figure label switches to "All-time downloads · last published", the scope reads "global snapshot", and a failed lookup says "Could not check @user" rather than claiming no models were found. See `src/AGENTS.md`; this is a correctness contract, not a style choice.

## Motion

Three motions, all disabled under `prefers-reduced-motion`:
1. **The tick.** Once per second the figure advances by whole-download arrivals drawn from the Poisson sampler in `api/stats-core.js`, and a new bar enters the channel. The total is `aria-live="off"`.
2. **The deploy.** Creator rows rise 8px in a 40ms-staggered sequence when results arrive.
3. **The entrance.** Sections fade up 22px on first paint only. It never replays on a scope change, and a 1.6s safety sweep reveals anything the observer missed so no section can be stranded invisible.

Under reduced motion the ticker, the channel, Lenis smooth scroll, and the entrance all stand down, and the strip says "Trace paused · reduced motion".

## Do's and Don'ts

### Do:
- **Do** keep amber live: if it is amber, it moves, erred, or acts (The One Phosphor Rule)
- **Do** set changing numbers tabular, always (The Tabular Numeral Rule)
- **Do** keep the estimator note; it is what makes the live figure honest
- **Do** verify contrast before adding a text token (The Contrast Floor)
- **Do** theme browser surfaces (selection, caret, scrollbar, focus) from the palette

### Don't:
- **Don't** add stat cards, KPI tiles, eyebrows, or a hero-metric header
- **Don't** add shadows, radii, gradients, glows, or glass
- **Don't** band the arrival bars by value; the mean rule already encodes above and below
- **Don't** label a fractional value column, or let a section separator become a wrapping divider
- **Don't** announce the ticking total to screen readers, or animate under reduced motion
- **Don't** let a degraded state imply a creator's totals