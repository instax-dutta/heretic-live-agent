---
name: Heretic Live
description: A self-inking data-desk broadsheet for public Heretic model reach.
colors:
  live-red: "#b2341c"
  live-red-deep: "#8e2815"
  newsprint: "#f6f1e7"
  paper-soft: "#fdfbf3"
  ink: "#1b1813"
  muted-ink: "#655c4e"
  faint-ink: "#6b6252"
  hairline: "#d9d0bc"
  hairline-soft: "#e7dfcc"
  plate-black: "#14120e"
  plate-dim: "#a49a88"
typography:
  display:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "clamp(40px, 6.4vw, 72px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.14em"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-soft}"
    padding: "0 18px"
    height: "50px"
  button-primary-hover:
    backgroundColor: "{colors.live-red}"
    textColor: "{colors.paper-soft}"
---

# Design System: Heretic Live

## Overview

**Creative North Star: "The Self-Inking Broadsheet"**

Heretic Live is a data-desk broadsheet that inks itself. Warm newsprint paper, ink near-black, and one signal-red live ink carry the whole surface: a folio masthead with dateline, a captioned black figure plate where the cumulative total ticks live above a red trace that draws its own pace, ledger rows instead of stat cards, and a boxed creator-inquiry form. The aesthetic philosophy is print authority plus visible motion — scale awe comes from a just-printed numeral and an inking seismograph line, never from neon, glass, or dashboard chrome. Density is editorial: tight rules, generous air between sections, small tracked labels against large serif headlines.

**Key Characteristics:**
- Newsprint ground with hairline rules and double-rule section breaks
- One black figure plate per view; the live numeral and trace live there
- Single signal-red accent reserved for live motion, status, and key actions
- Serif argument (headlines, standfirsts, notes) against grotesque figures and labels

## Colors

Restrained paper-and-ink neutrals plus one saturated red that owns everything live.

### Primary
- **Live Ink Red** (#b2341c): the trace line, the live dot, the stamped live status, row bars, hover states, focus rings, and text selection. Anything red on the page is moving or actionable.
- **Conviction Deep Red** (#8e2815): error text, the degraded-data stamp, and inline code — red with gravity, never for decoration.

### Neutral
- **Newsprint** (#f6f1e7): page ground.
- **Soft Paper** (#fdfbf3): inquiry box and hovered-row grounds.
- **Print Ink** (#1b1813): text, rules that matter, masthead borders, primary buttons.
- **Muted Ink** (#655c4e): secondary text, labels, dateline (5.5:1 on newsprint).
- **Faint Ink** (#6b6252): captions, ranks, placeholders — the lightest ink allowed for informative text (4.5:1 on newsprint).
- **Hairline** (#d9d0bc): ledger dividers.
- **Soft Hairline** (#e7dfcc): bar tracks and loading shimmer.
- **Plate Black** (#14120e): the figure plate ground.
- **Plate Dim** (#a49a88): secondary text on the plate.

### Named Rules
**The One Red Rule.** Red appears only where something is live, erred, or acts. Its rarity is the point; a red element that never moves is a defect.

## Typography

**Display Font:** Spectral, Georgia, serif (headlines, standfirsts, editorial notes)
**Body/Label Font:** Archivo, system-ui, sans-serif (masthead, figures, labels, buttons)
**Measurement Font:** system mono stack (ui-monospace, SFMono-Regular, Menlo) — raw download readings, ranks, and the @ mark only.

**Character:** A serif argues, a grotesque counts. Spectral carries every sentence-length thought; Archivo 800/900 sets the nameplate and the giant tabular numeral; mono never speaks prose.

### Hierarchy
- **Display** (Spectral 500, clamp(40px, 6.4vw, 72px), 1.02): the front-page question only.
- **Headline** (Spectral 600, 30px, 1.1): section heads, inquiry and result titles.
- **Figure numeral** (Archivo 800, clamp(52px, 10vw, 128px), 1.0, tabular): the live total. A figure, not a heading — exempt from the display cap by intent.
- **Body** (Archivo 400, 14px, 1.55, ≤62ch): interface prose.
- **Standfirst/note** (Spectral italic, 14–19px): ledes and ledger notes.
- **Label** (Archivo 700, 11px, +0.14em tracking, uppercase): dateline, plate labels, captions, form labels.

### Named Rules
**The Tabular Numeral Rule.** Every number that changes or compares is tabular (`font-variant-numeric: tabular-nums`); a ticking figure that jitters in width is a defect.
**The No-Kicker Rule.** Headings carry their own weight — no eyebrow label above a heading, ever.

## Layout

Single centered folio column (min(100% − page inset, 1080px)). Reading order: masthead folio → front headline + standfirst + press line → Fig. 1 plate → ledger rows → inquiry box → results or methods note → imprint footer. Section breaks are 3px double rules; internal divisions are 1px hairlines. Spacing rhythm: tight groups (12–18px), generous separations (36–72px), always more space above a heading than below it. Responsive: inquiry and methods stack to one column under 960px; ledger notes drop below values under 760px; model rows shed the bar column, then collapse to rank/name/number under 600px.

## Elevation & Depth

No shadows anywhere — depth is conveyed by paper tone steps (newsprint → soft paper), rule weights (hairline vs. double rule), and one inverted plate (black figure on paper). Flat by principle, not by omission.

### Named Rules
**The Print Flat Rule.** Nothing floats. Emphasis comes from ink weight, scale, or the single plate inversion — never from a shadow.

## Shapes

Sharp print edges throughout: zero border radius on every surface, box, and control. The only circle in the system is the 8px live dot. Rules do the shaping: 3px double rules open major sections, 1.5px strokes box the inquiry form and stamps, 1px hairlines divide ledger rows. Stamps (status markers) sit rotated −1.2deg like a struck mark.

## Components

### Figure plate
Inverted black ground ({colors.plate-black}) holding the tabular live numeral in newsprint, a canvas trace in live red, and a pace line with the pulsing dot. Caption above in tracked labels. The trace keeps ~120 seconds of inked history; its stroke weight grows with the download pace.

### Ledger rows
Label | tabular figure | right-aligned serif-italic note, divided by hairlines. Replaces stat cards everywhere.

### Buttons
- **Shape:** square corners, no radius.
- **Primary:** ink ground, paper text, 12px tracked uppercase; min-height 50px.
- **Hover:** ground shifts to live red. **Focus:** 2px live-red outline offset 3px.
- **Text buttons:** transparent, deep-red, underlined with 3px offset.

### Inquiry field
1.5px ink box on paper; mono @ sigil in live red; border shifts to live red on focus-within; caret in live red; placeholder in faint ink.

### Stamps
1.5px bordered status marks, tracked uppercase, struck at −1.2deg. Live stamp in red, degraded stamp in deep red.

### Model rows
Anchor-addressable ledger rows (rank, name + mono id, bar, mono readings, red arrow). Hovering the list dims siblings to 55% while the focused row lifts to soft paper; new results deploy in a short staged sequence (motion-safe only).

### Correction notice
Deep-red boxed correction for the degraded-data state, with inline retry action.

## Do's and Don'ts

### Do:
- **Do** keep red live: if it is red, it moves, erred, or acts (The One Red Rule).
- **Do** set changing numbers tabular, always (The Tabular Numeral Rule).
- **Do** let headings stand alone with no kicker (The No-Kicker Rule).
- **Do** keep informative text at 4.5:1 or better — faint ink (#6b6252) is the floor.
- **Do** theme browser surfaces (selection, caret, scrollbar, focus, underline offset) from the palette.

### Don't:
- **Don't** build stat cards, eyebrows, or hero-metric headers — the figure plate and ledger own those jobs.
- **Don't** add shadows, radii, gradients, or glass; the world is flat print.
- **Don't** use mono for prose or the grotesque/serif interchangeably — serif argues, grotesque counts, mono measures.
- **Don't** announce the ticking total to screen readers (`aria-live="off"`) or animate under `prefers-reduced-motion`.
