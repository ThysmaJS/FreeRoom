# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

ESGI students (École Supérieure de Génie Informatique), a single role — no admin/staff interface exists or is planned. They use the app standing in a hallway between classes (mobile-heavy usage) or at a laptop, needing to find an actually-free room right now, or reserve a short slot for later the same day.

## Product Purpose

Let a student see, at a glance, which of the school's rooms are free at a given hour today, and reserve a short slot in a few taps — so they stop wandering the corridors checking closed doors. Success is a confirmed reservation that is guaranteed not to conflict with anyone else's, verified server-side.

## Positioning

Deliberately not a scheduling suite or LMS module: one day, one school's fixed room list, one flow (see → book → cancel). It wins on speed-to-a-free-room over generic calendar tools, which force students through views and filters built for a different job.

## Operating Context

- Single day view only, no multi-week calendar (in-scope MVP boundary, not a missing feature).
- Fixed list of 8 pre-seeded rooms (amphitheaters, classrooms, TP rooms, a meeting room), each with a capacity; no in-app room management.
- Fixed hourly slots, 8h–19h, one room × one hour per booking.
- The day grid live-refreshes (~8s poll) so a slot another student just took stops showing as free without a manual reload.
- Primarily used in short bursts on a phone between classes; also used at a desk.

## Capabilities and Constraints

- Auth: email + password, session cookie (JWT). No SSO/OAuth.
- A student can cancel only their own reservations; enforced server-side (403 on a cross-user attempt), not just hidden in the UI.
- Double-booking is impossible by construction: a database unique constraint on (room, date, hour), not just a client-side check.
- Login/signup are rate-limited per IP (brute-force protection).
- Out of scope by design: room management UI, email/SMS notifications, multi-week calendars, advanced search/filters.

## Brand Commitments

- Product name: **FreeRoom** (French copy throughout — the user base is French-speaking ESGI students).
- Must visually read as ESGI-branded. Confirmed brand facts, extracted directly from esgi.fr's live CSS (not a guess):
  - `--main-blue: #001B40` (deep navy, primary), `--light-blue: #00EAFF` (bright cyan, accent), `--yellow: #FFDE00` (mustard yellow, secondary accent).
  - Cyan glow shadow pattern on key elements: `box-shadow: 0px 2px 10px #00EAFF4D`.
  - Yellow used as a hover-state fill swap on buttons/interactive squares.
  - Pill-shaped / heavily-rounded buttons (radius up to 9999px; 20–30px on cards).
  - Body copy set in Roboto (Regular/Medium/Bold/Black), freely available. Headlines use a proprietary geometric display face (Monument Extended-family) that is not licensed for this project — do not source it; approximate with heavier Roboto weights or another already-available face instead.
- ESGI belongs to the Skolae school group; that site's general tone (modern, clean, professional, card-based, generous whitespace) is a secondary reference, subordinate to ESGI's own concrete brand facts above.
- This is a daily-use utility, not a marketing site: legibility and fast scanning of many small grid cells outrank marketing flourish, even where that means restraining how literally esgi.fr's own chrome gets reused.

## Evidence on Hand

- Real seeded room data: 8 rooms (2 amphitheaters, several classrooms/TP rooms, one meeting room), each with a capacity, in `db/schema.sql` / `scripts/seed.ts`.
- ESGI CSS tokens above, extracted directly from the live site's stylesheet on 2026-09-15; no logo files or other brand assets are available locally.

## Product Principles

- Stay inside the one-flow MVP scope; do not let redesign work grow new features.
- Server-side correctness is never optional for the sake of a smoother UI (403/409 always enforced in the backend, regardless of what the frontend also does).
- Optimize for scanning speed in a dense grid over decorative flourish — this is opened dozens of times a day, not admired once.
- Mobile-first reliability: most real usage is a phone, mid-hallway, on flaky wifi.

## Accessibility & Inclusion

No formally required standard confirmed; design to normal good-practice contrast and touch-target sizing given the mobile-hallway usage context above.
