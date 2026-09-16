import "server-only";
import { sql } from "@/lib/db";

export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 19;

export const FLOORS = [
  { value: 0, label: "RDC" },
  { value: 1, label: "1er étage" },
  { value: 2, label: "2e étage" },
] as const;

export function isValidFloor(floor: number): boolean {
  return FLOORS.some((f) => f.value === floor);
}

export type SlotStatus = "free" | "booked" | "own" | "past";

export type RoomWithSlots = {
  id: number;
  name: string;
  capacity: number | null;
  slots: { hour: number; status: SlotStatus; bookingId: number | null }[];
};

// The whole app's notion of "today"/"the current hour" is Europe/Paris,
// regardless of the server's own system timezone — a k3s node has no
// reason to run on French time, and every "now"-derived value here would
// silently drift off by whatever that offset is otherwise.
const TIME_ZONE = "Europe/Paris";

function parisNowParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    // hour12:false can format midnight as "24" instead of "00" depending
    // on the runtime's ICU data.
    hour: Number(get("hour")) % 24,
  };
}

function isPastSlot(date: string, hour: number, now = new Date()) {
  const { date: today, hour: currentHour } = parisNowParts(now);
  if (date < today) return true;
  if (date > today) return false;
  return hour < currentHour;
}

export function isValidDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())
  );
}

export function todayISODate() {
  return parisNowParts(new Date()).date;
}

export function currentHourInParis() {
  return parisNowParts(new Date()).hour;
}

// Pure calendar-day arithmetic, no "now" involved — anchored at UTC noon
// so it's immune to the server's timezone too: noon UTC always falls on
// the same calendar day in Europe/Paris (CET/CEST is at most UTC+2).
export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, 12));
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return toISODateUTC(anchor);
}

export function formatDateFr(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(anchor);
}

function toISODateUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type UserBooking = {
  id: number;
  roomId: number;
  roomName: string;
  date: string;
  startHour: number;
  endHour: number;
};

export async function getUserBookings(userId: number): Promise<UserBooking[]> {
  const rows = await sql<
    {
      id: number;
      room_id: number;
      room_name: string;
      date: string;
      start_hour: number;
      end_hour: number;
    }[]
  >`
    SELECT b.id, b.room_id, r.name AS room_name,
           to_char(b.date, 'YYYY-MM-DD') AS date, b.start_hour, b.end_hour
    FROM bookings b
    JOIN rooms r ON r.id = b.room_id
    WHERE b.user_id = ${userId} AND b.date >= CURRENT_DATE
    ORDER BY b.date ASC, b.start_hour ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    roomId: row.room_id,
    roomName: row.room_name,
    date: row.date,
    startHour: row.start_hour,
    endHour: row.end_hour,
  }));
}

export async function getRoomsForDate(
  date: string,
  userId: number,
  floor: number
): Promise<RoomWithSlots[]> {
  const rooms = await sql<
    { id: number; name: string; capacity: number | null }[]
  >`
    SELECT id, name, capacity FROM rooms WHERE floor = ${floor} ORDER BY name
  `;

  type BookingRow = {
    id: number;
    room_id: number;
    user_id: number;
    start_hour: number;
  };

  const bookings = await sql<BookingRow[]>`
    SELECT id, room_id, user_id, start_hour FROM bookings WHERE date = ${date}
  `;

  const byRoom = new Map<number, BookingRow[]>();
  for (const booking of bookings) {
    const list = byRoom.get(booking.room_id) ?? [];
    list.push(booking);
    byRoom.set(booking.room_id, list);
  }

  return rooms.map((room) => {
    const roomBookings = byRoom.get(room.id) ?? [];
    const slots = [];
    for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
      const booking = roomBookings.find((b) => b.start_hour === hour);
      const status: SlotStatus = isPastSlot(date, hour)
        ? "past"
        : !booking
          ? "free"
          : booking.user_id === userId
            ? "own"
            : "booked";
      slots.push({
        hour,
        status,
        bookingId: booking?.id ?? null,
      });
    }
    return { id: room.id, name: room.name, capacity: room.capacity, slots };
  });
}

type CreateBookingResult =
  | { ok: true; id: number }
  | { ok: false; reason: "conflict" | "invalid" | "past" };

export async function createBooking({
  roomId,
  userId,
  date,
  startHour,
  isAdmin = false,
}: {
  roomId: number;
  userId: number;
  date: string;
  startHour: number;
  isAdmin?: boolean;
}): Promise<CreateBookingResult> {
  if (
    !Number.isInteger(roomId) ||
    !isValidDate(date) ||
    !Number.isInteger(startHour) ||
    startHour < OPENING_HOUR ||
    startHour >= CLOSING_HOUR
  ) {
    return { ok: false, reason: "invalid" };
  }

  if (isPastSlot(date, startHour)) {
    return { ok: false, reason: "past" };
  }

  // Admins take priority over an existing booking — a last-minute course
  // can bump whoever already holds the slot. Bumping and taking the slot
  // happen atomically so no request can observe it half-free.
  if (isAdmin) {
    const rows = await sql.begin(async (tx) => {
      await tx`
        DELETE FROM bookings
        WHERE room_id = ${roomId} AND date = ${date} AND start_hour = ${startHour}
      `;
      return tx<{ id: number }[]>`
        INSERT INTO bookings (room_id, user_id, date, start_hour, end_hour)
        VALUES (${roomId}, ${userId}, ${date}, ${startHour}, ${startHour + 1})
        RETURNING id
      `;
    });
    return { ok: true, id: rows[0].id };
  }

  try {
    const rows = await sql<{ id: number }[]>`
      INSERT INTO bookings (room_id, user_id, date, start_hour, end_hour)
      VALUES (${roomId}, ${userId}, ${date}, ${startHour}, ${startHour + 1})
      RETURNING id
    `;
    return { ok: true, id: rows[0].id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, reason: "conflict" };
    }
    throw error;
  }
}

type CancelBookingResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" };

export async function cancelBooking({
  bookingId,
  userId,
}: {
  bookingId: number;
  userId: number;
}): Promise<CancelBookingResult> {
  const rows = await sql<{ id: number; user_id: number }[]>`
    SELECT id, user_id FROM bookings WHERE id = ${bookingId}
  `;
  const booking = rows[0];

  if (!booking) {
    return { ok: false, reason: "not_found" };
  }
  if (booking.user_id !== userId) {
    return { ok: false, reason: "forbidden" };
  }

  await sql`DELETE FROM bookings WHERE id = ${bookingId}`;
  return { ok: true };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}
