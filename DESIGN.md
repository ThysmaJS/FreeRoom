---
name: FreeRoom
description: An ESGI-branded amphitheater grid for finding and booking a free room by the hour.
colors:
  navy: "#001b40"
  cyan: "#00eaff"
  yellow: "#ffde00"
  neutral-bg: "#ffffff"
  neutral-surface: "#f3f6fb"
  neutral-surface-strong: "#e8edf6"
  danger: "#d6304a"
typography:
  headline:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.25
  title:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 900
    lineHeight: 1.3
  body:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 900
    letterSpacing: "0.02em"
    textTransform: "uppercase"
rounded:
  input: "16px"
  card: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.navy}"
    textColor: "#ffffff"
  button-own-slot:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.navy}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "6px 8px"
  nav-pill-active:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.navy}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  input-field:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.navy}"
    rounded: "{rounded.input}"
    padding: "10px 16px"
---

# Design System: FreeRoom

## Overview

**Creative North Star: "The Lecture Hall Board"**

FreeRoom reads as an amphitheater's tiered seating turned into a status board: rows of rooms bank away from the viewer in subtly receding tone, and every cell is either lit or dark rather than checked or unchecked. The world is ESGI's own navy-ground, cyan-signal palette carried at full commitment — navy is the material everything sits on, cyan is reserved for the single moment something is live, and yellow marks exactly one thing: the hour that matters right now. This is a utility opened dozens of times a day between classes, so the system stays flat, fast to scan, and refuses decorative flourish; the only motion in the whole system is a slow breathing glow on a student's own booking.

Two Roboto weights carry all type — Regular for reading, Black for everything that needs to be found at a glance (labels, headers, buttons, prices of information). There is no in-between weight and no separate display face: ESGI's proprietary headline face isn't licensed for this build, so Black-weight Roboto stands in for it everywhere a headline would otherwise go.

**Key Characteristics:**
- Navy ground, cyan-as-signal (never decorative), yellow as a single-purpose "now" marker
- Two Roboto weights only: Regular (400) and Black (900)
- Pill controls and generous 20px card radii throughout; no sharp corners
- Cyan glow-shadow is the system's only elevation device, tied to live/active/own state
- Monotonic tonal recede on grid rows (tiered), never an alternating zebra stripe

## Colors

Navy is the ground the whole app stands on; cyan is spent sparingly as the one "this is live/mine/focused" signal; yellow appears exactly once per view.

### Primary
- **ESGI Navy** (`#001b40`): the header background, all primary buttons, sticky grid labels, and — inverted — the whole app background in dark mode. This is the app's material, not an accent.

### Secondary
- **ESGI Cyan** (`#00eaff`): the sole lit-state signal. Used on the active nav pill, the focus ring/glow (`box-shadow: 0 2px 10px #00eaff4d` via `--accent-glow`), and a student's own booked slot (with the breathing `glow-pulse` animation). In dark mode it also becomes the header/button ground, inverting with navy. Never used as plain decoration.

### Tertiary
- **ESGI Yellow** (`#ffde00`): reserved for exactly one job — marking the current hour column on the day grid (a underline bar on the hour header plus a faint 10%-opacity tint on that column's cells). It does not appear anywhere else in the shipped app.

### Neutral
- **Paper White** (`#ffffff`): light-mode app background.
- **Cool Surface** (`#f3f6fb`): light-mode card/table-header surface, one step off white.
- **Cool Surface Strong** (`#e8edf6`): light-mode deepest neutral surface (table header, "Occupé" chip fill, most-receded grid row).
- **Danger Red** (`#d6304a`): the only non-brand color; form/action error text, and — as an outlined pill, never filled — the admin "Forcer" override button on an already-booked grid cell (the one destructive action in the app).

In dark mode the neutral scale and navy invert: background becomes navy itself, surfaces are navy lightened 6%/12% via `color-mix`, and foreground text goes near-white (`#f4f8ff`). This is a full ground inversion, not a separate dark palette.

### Named Rules
**The Lit Cell Rule.** State on the grid is drawn as light or its absence, never as a checkbox or icon: a free slot is a solid navy chip inviting a tap, an own booking is a lit cyan chip with a slow glow, and a booked/past slot is dim, unlit text with no fill at all.

**The One Signal Rule.** Cyan appears only where something is genuinely live: keyboard focus, the active nav destination, or a student's own reservation. If cyan shows up anywhere else in a new screen, that's a violation, not a new use of the brand accent.

**The Single Yellow Rule.** Yellow marks the current hour and nothing else. It is not a secondary accent, a warning color, or a hover-fill (ESGI's own site uses it as a hover-fill swap; this build deliberately narrows that down to the one "now" job).

## Typography

**Body Font:** Roboto (with system-ui, sans-serif fallback)
**Label/Headline Font:** Roboto Black (same family, heavier weight — not a separate face)

**Character:** A single, disciplined family carrying two distinct jobs: Regular for anything read continuously, Black for anything scanned — labels, room names, hours, buttons, headings. The Black weight is doing the job ESGI's unlicensed proprietary display face would otherwise do.

### Hierarchy
- **Headline** (900, 1.5rem/24px, 1.25 line-height): auth page titles ("Se connecter", "Créer un compte"), the error-state heading.
- **Title** (900, 1.125rem/18px, 1.3 line-height): page-level headings ("Mes réservations"), the selected date on the grid header.
- **Body** (400, 0.875rem/14px, 1.5 line-height): form labels' companion copy, muted meta text, list body copy, cell "Occupé"/"Passé" text.
- **Label** (900, 0.75rem/12px, uppercase, 0.02em tracking): the grid's "Salle" column header and other small structural labels.

Beyond these, room names, hour headers, and every button label are also set in the Black weight at body size (14–16px) — weight, not size, is what marks something as structural versus prose.

### Named Rules
**The Two-Weight Rule.** Only Regular (400) and Black (900) ship. No Medium, Semibold, or Light — an in-between weight was flagged and removed in review specifically because weight-noise undercuts the "lit or not" reading of the grid.

## Layout

A single centered column, `max-w-6xl`, with consistent horizontal padding (`16px` mobile / `32px` at `sm`) and vertical rhythm in `20px` steps (`gap-5`) between page sections. The navy header spans full width above the content column at every breakpoint. The day grid itself scrolls horizontally on narrow viewports (`overflow-x-auto`) with the room-name column pinned via `position: sticky`, so a phone user can pin "which room" while scrubbing through hours. Density stays tight and consistent — grid cells run `6px` internal padding, table rows `10px` vertical — because the product is scanned dozens of times a day, not admired once.

## Elevation & Depth

FreeRoom is flat by default: no ambient drop shadows, no card lift on hover, no layered surfaces beyond the tonal steps in the Colors section. The one exception is a single soft ambient shadow (`0 2px 24px rgba(0,27,64,0.08)`) under the auth card (login/signup), giving that one full-bleed-background surface a slight lift off the page. Everywhere else, elevation is replaced by the cyan glow — a structural signal of "this is live," not an ambient depth cue.

### Shadow Vocabulary
- **Cyan glow** (`box-shadow: 0 2px 10px color-mix(in srgb, #00eaff 45%, transparent)`, i.e. ESGI's own `0px 2px 10px #00EAFF4D`): keyboard focus rings, the active nav pill, and any button carrying `.glow`.
- **Glow pulse** (breathing between `0 2px 10px` at 35% cyan and `0 2px 18px` at 65% cyan, 3.2s ease-in-out loop, disabled under `prefers-reduced-motion`): exclusively a student's own booked slot on the grid — the system's one authored looping animation.
- **Auth card ambient** (`0 2px 24px rgba(0,27,64,0.08)`): the login/signup card only.

### Named Rules
**The Glow-Not-Shadow Rule.** Depth is never conveyed with a generic drop shadow tied to hierarchy. The only shadow that means something is the cyan glow, and it always means "live, focused, or yours."

## Shapes

Everything rounds generously and consistently: **pill** radius (`9999px`) on every button and nav link, **card** radius (`20px`) on the grid container, the auth card, and the reservations list, and a slightly tighter **input** radius (`16px`, Tailwind `rounded-2xl`) on form fields. Icon-only controls (header logout, date-step chevrons, the auth/error badge icon) are full circles at `size-9`/`size-11`/`size-14`. There are no sharp corners anywhere in the shipped UI. Hairline borders (`color-mix` navy-ink at 12%/22% opacity) separate cards and table rows instead of shadows.

## Components

### Buttons
- **Shape:** pill (`border-radius: 9999px`) at every size, from full-width form submits down to the compact grid-cell action buttons.
- **Primary (forms, error retry):** navy background, white text, `font-weight: 900`, carries the cyan `.glow` shadow, `hover:opacity-90`, `disabled:opacity-60`. Inverts to cyan-background/navy-text in dark mode.
- **Grid "Réserver" (free cell):** compact navy pill, `text-xs font-black`, no glow at rest (glow is reserved for focus/live state, not every button).
- **Grid "Annuler" (own booking):** cyan pill, navy text, carries the looping `glow-pulse` — this is the one button that is always visibly "lit."
- **Grid "Forcer" (admin override, booked cell):** outlined danger-red pill, transparent fill, `text-xs font-black`, `hover:bg-danger/10` — visually distinct from every other grid action since it takes the slot from another user. Confirmed via a native browser dialog before it fires; admin-only.
- **Icon-only (logout, date step):** circular, transparent/bordered, `hover:bg-surface` or `hover:bg-white/10` depending on context; no fill at rest.

### Cards / Containers
- **Corner Style:** 20px radius (`--radius-card`) on the grid wrapper, the auth card, and the reservations list.
- **Background:** `neutral-bg`/`neutral-surface` in light mode, navy-tinted surfaces in dark mode.
- **Shadow Strategy:** flat; see Elevation & Depth. Only the auth card carries an ambient shadow.
- **Border:** hairline (`color-mix` navy-ink 12% opacity) around every card and between grid rows.

### Inputs / Fields
- **Style:** `16px`-radius pill-leaning field, background matches page background, `1px` border at `border-strong` opacity.
- **Focus:** border shifts to solid cyan plus a `2px` cyan ring at 45% opacity (`focus-visible:ring-accent-glow`) — the same glow language as buttons and nav, not a separate focus treatment.
- **Error:** inline red (`#d6304a`) text below the field; the field itself does not change color on error.

### Navigation
- **Style:** navy full-width header bar; two nav destinations as pills (`Salles`, `Mes réservations`).
- **Active state:** cyan pill fill, navy text, cyan glow.
- **Default/hover:** `white/80` text, `hover:bg-white/10`.
- **Mobile:** labels collapse to icon-only under `sm`; the pill shape and states are unchanged.

### Day Grid (signature component)
The grid is the product's defining surface: rooms as sticky-labeled rows, hours as columns. Rows recede in tone top-to-bottom via a monotonic `color-mix` blend from `--background` to `--surface-strong` (never alternating stripes) — read as tiers banking away from a stage. The current-hour column carries the single yellow marker (an underline bar on its header cell, a faint `10%`-opacity tint on its body cells). Cell content is state-as-fill: free = navy "Réserver" chip, own = cyan glow-pulsing "Annuler" chip, booked = a flat muted `surface-strong` "Occupé" chip, past = plain muted text with no chip at all.

## Do's and Don'ts

### Do:
- **Do** use pill radius (`9999px`) for every button and nav control, and `20px` card radius for every container.
- **Do** reserve the cyan glow (`0 2px 10px`, 45% cyan) for focus, the active nav pill, and a user's own live booking — never as decoration.
- **Do** set structural/scannable text (labels, room names, buttons, headings) in Roboto Black (900) and everything else in Roboto Regular (400).
- **Do** recede grid rows with a monotonic tonal blend, tiered top-to-bottom.
- **Do** confine yellow to the single current-hour marker.

### Don't:
- **Don't** introduce a third font weight (no Medium/Semibold/Light); the Two-Weight Rule is confirmed by review, not incidental.
- **Don't** alternate row shading (zebra striping) on the grid or any list — recede monotonically instead.
- **Don't** use cyan as a general accent color on non-live elements (illustrations, dividers, static badges).
- **Don't** add ambient drop shadows for hierarchy; the only meaningful shadow is the cyan glow, plus the one ambient lift reserved for the auth card.
- **Don't** use yellow as a hover-fill or secondary accent, even though ESGI's own site does — this build narrows yellow to the "now" marker only.
