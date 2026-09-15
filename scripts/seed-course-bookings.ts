import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "../lib/db";

// Mirrors lib/bookings.ts OPENING_HOUR/CLOSING_HOUR — not imported directly
// since that module is guarded with "server-only" for the Next.js runtime.
const OPENING_HOUR = 8;
const CLOSING_HOUR = 19;

// Fake course occupancy, so the grid looks like a real campus timetable
// instead of an empty demo. All fake bookings belong to one dummy
// "Planning ESGI" account so they're easy to tell apart from real student
// reservations and easy to clear/regenerate on a rerun.

const DAYS_AHEAD = 30; // "chaque jour" — a month of forward-looking days
const PLANNING_EMAIL = "planning@esgi.fr";
const PLANNING_NAME = "Planning ESGI";

// Probability a slot starting at this hour is taken by a course, before
// room/day adjustments. The DB only supports whole-hour slots (8h, 9h, ...,
// 18h) — there's no 1h30/quarter-hour granularity — so this approximates
// the school's real timetable of six 1h30 "créneaux" back to back on the
// hourly grid:
//   8h–9h30 · 9h45–11h15 · 11h30–13h · [pause déjeuner 13h–14h]
//   14h–15h30 · 15h45–17h15 · 17h15–19h (rare)
// An hourly cell mostly covered by a créneau is weighted high; 13h is the
// lunch break (kept free); 17h/18h fall mostly in the rarely-used last
// créneau, so they stay rare.
const HOUR_WEIGHT: Record<number, number> = {
  8: 0.75, // 8h–9h30 créneau starts right on the hour
  9: 0.85, // tail of 8h–9h30 + head of 9h45–11h15
  10: 0.9, // fully inside 9h45–11h15
  11: 0.78, // tail of 9h45–11h15, 15min gap, head of 11h30–13h
  12: 0.85, // fully inside 11h30–13h
  13: 0.05, // pause déjeuner 13h–14h
  14: 0.88, // fully inside 14h–15h30
  15: 0.82, // tail of 14h–15h30 + head of 15h45–17h15
  16: 0.88, // fully inside 15h45–17h15
  17: 0.15, // tail of 15h45–17h15, mostly the rare 17h15–19h créneau
  18: 0.06, // fully inside the rare 17h15–19h créneau
};

const ROOM_MULTIPLIER: Record<string, number> = {
  "Amphi A": 1.05,
  "Amphi B": 1.0,
  "Salle 101": 0.9,
  "Salle 102": 0.9,
  "Salle 103": 0.85,
  "Salle TP 1": 0.8,
  "Salle TP 2": 0.8,
  "Salle de réunion": 0.35, // meeting room, rarely used for courses
};

function weekdayMultiplier(date: Date) {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0) return 0.05;
  if (day === 6) return 0.25;
  return 1;
}

// Deterministic PRNG so reruns produce the same-looking timetable.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getOrCreatePlanningUser(): Promise<number> {
  const existing = await sql<{ id: number }[]>`
    SELECT id FROM users WHERE email = ${PLANNING_EMAIL}
  `;
  if (existing[0]) return existing[0].id;

  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
  const rows = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash)
    VALUES (${PLANNING_NAME}, ${PLANNING_EMAIL}, ${passwordHash})
    RETURNING id
  `;
  return rows[0].id;
}

async function main() {
  const planningUserId = await getOrCreatePlanningUser();

  const rooms = await sql<{ id: number; name: string }[]>`
    SELECT id, name FROM rooms
  `;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = toISODate(today);
  const endDate = toISODate(
    new Date(today.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000)
  );

  // Clear this account's previous fake bookings in the window so the
  // script can be rerun without accumulating stale data.
  await sql`
    DELETE FROM bookings
    WHERE user_id = ${planningUserId}
      AND date >= ${startDate}
      AND date <= ${endDate}
  `;

  // Slots already taken by anyone else (real reservations) must be left
  // alone — a room can only have one booking per hour.
  const taken = await sql<{ room_id: number; date: string; start_hour: number }[]>`
    SELECT room_id, to_char(date, 'YYYY-MM-DD') AS date, start_hour
    FROM bookings
    WHERE date >= ${startDate} AND date <= ${endDate}
  `;
  const takenKeys = new Set(
    taken.map((t) => `${t.room_id}|${t.date}|${t.start_hour}`)
  );

  const random = mulberry32(42);
  const rows: {
    room_id: number;
    user_id: number;
    date: string;
    start_hour: number;
    end_hour: number;
  }[] = [];

  for (let offset = 0; offset <= DAYS_AHEAD; offset++) {
    const date = new Date(today.getTime() + offset * 24 * 60 * 60 * 1000);
    const isoDate = toISODate(date);
    const dayMultiplier = weekdayMultiplier(date);

    for (const room of rooms) {
      const roomMultiplier = ROOM_MULTIPLIER[room.name] ?? 0.75;

      for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
        const key = `${room.id}|${isoDate}|${hour}`;
        if (takenKeys.has(key)) continue;

        const probability = Math.min(
          0.95,
          (HOUR_WEIGHT[hour] ?? 0.5) * roomMultiplier * dayMultiplier
        );
        if (random() < probability) {
          rows.push({
            room_id: room.id,
            user_id: planningUserId,
            date: isoDate,
            start_hour: hour,
            end_hour: hour + 1,
          });
        }
      }
    }
  }

  if (rows.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await sql`
        INSERT INTO bookings ${sql(
          chunk,
          "room_id",
          "user_id",
          "date",
          "start_hour",
          "end_hour"
        )}
        ON CONFLICT (room_id, date, start_hour) DO NOTHING
      `;
    }
  }

  console.log(
    `Seeded ${rows.length} fake course bookings across ${DAYS_AHEAD + 1} days (${startDate} → ${endDate}) for "${PLANNING_NAME}".`
  );
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
