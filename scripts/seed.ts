import { sql } from "../lib/db";

const rooms: { name: string; capacity: number }[] = [
  { name: "Amphi A", capacity: 200 },
  { name: "Amphi B", capacity: 150 },
  { name: "Salle 101", capacity: 30 },
  { name: "Salle 102", capacity: 30 },
  { name: "Salle 103", capacity: 24 },
  { name: "Salle TP 1", capacity: 20 },
  { name: "Salle TP 2", capacity: 20 },
  { name: "Salle de réunion", capacity: 8 },
];

async function main() {
  for (const room of rooms) {
    await sql`
      INSERT INTO rooms (name, capacity)
      VALUES (${room.name}, ${room.capacity})
      ON CONFLICT (name) DO NOTHING
    `;
  }
  console.log(`Seeded ${rooms.length} rooms.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
