import "server-only";
import { sql } from "@/lib/db";

export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 19;

export type SlotStatus = "free" | "booked" | "own";

export type RoomWithSlots = {
  id: number;
  name: string;
  capacity: number | null;
  slots: { hour: number; status: SlotStatus; bookingId: number | null }[];
};

export function isValidDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(`${date}T00:00:00`).getTime())
  );
}

export function todayISODate() {
  return toISODate(new Date());
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function formatDateFr(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
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
  userId: number
): Promise<RoomWithSlots[]> {
  const rooms = await sql<
    { id: number; name: string; capacity: number | null }[]
  >`
    SELECT id, name, capacity FROM rooms ORDER BY name
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
      slots.push({
        hour,
        status: (!booking
          ? "free"
          : booking.user_id === userId
            ? "own"
            : "booked") as SlotStatus,
        bookingId: booking?.id ?? null,
      });
    }
    return { id: room.id, name: room.name, capacity: room.capacity, slots };
  });
}

type CreateBookingResult =
  | { ok: true; id: number }
  | { ok: false; reason: "conflict" | "invalid" };

export async function createBooking({
  roomId,
  userId,
  date,
  startHour,
}: {
  roomId: number;
  userId: number;
  date: string;
  startHour: number;
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
