import { sql } from "../lib/db";

const FLOOR = { rdc: 0, first: 1, second: 2 } as const;

function numberedRooms(from: number, to: number, floor: number, capacity: number) {
  const rooms = [];
  for (let n = from; n <= to; n++) {
    rooms.push({ name: `Salle ${String(n).padStart(3, "0")}`, capacity, floor });
  }
  return rooms;
}

const rooms: { name: string; capacity: number; floor: number }[] = [
  { name: "Amphi", capacity: 200, floor: FLOOR.rdc },
  ...numberedRooms(1, 10, FLOOR.rdc, 30),
  ...numberedRooms(101, 112, FLOOR.first, 30),
  ...numberedRooms(201, 212, FLOOR.second, 30),
];

// One-time cleanup for the floor reorganization: "Amphi A" becomes the
// single ground-floor "Amphi", and the rooms outside the new 001-010 /
// 101-112 / 201-212 numbering are retired. Safe to leave in place — a
// no-op once applied.
const RENAMES: [from: string, to: string][] = [["Amphi A", "Amphi"]];
const REMOVED_ROOM_NAMES = [
  "Amphi B",
  "Salle TP 1",
  "Salle TP 2",
  "Salle de réunion",
];

async function main() {
  for (const [from, to] of RENAMES) {
    await sql`UPDATE rooms SET name = ${to} WHERE name = ${from}`;
  }
  await sql`DELETE FROM rooms WHERE name = ANY(${REMOVED_ROOM_NAMES})`;

  for (const room of rooms) {
    await sql`
      INSERT INTO rooms (name, capacity, floor)
      VALUES (${room.name}, ${room.capacity}, ${room.floor})
      ON CONFLICT (name) DO UPDATE
        SET capacity = EXCLUDED.capacity, floor = EXCLUDED.floor
    `;
  }
  console.log(`Seeded ${rooms.length} rooms across 3 floors.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
