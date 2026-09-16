import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "@/lib/db";
import { addDays, cancelBooking, createBooking, todayISODate } from "@/lib/bookings";

let roomId: number;
let userAId: number;
let userBId: number;
let adminId: number;

beforeAll(async () => {
  const [room] = await sql<{ id: number }[]>`
    INSERT INTO rooms (name, capacity) VALUES ('Unit Test Room', 10)
    RETURNING id
  `;
  roomId = room.id;

  const [userA] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash)
    VALUES ('Unit User A', 'unit-user-a@test.local', 'hash')
    RETURNING id
  `;
  userAId = userA.id;

  const [userB] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash)
    VALUES ('Unit User B', 'unit-user-b@test.local', 'hash')
    RETURNING id
  `;
  userBId = userB.id;

  const [admin] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash, is_admin)
    VALUES ('Unit Admin', 'unit-admin@test.local', 'hash', true)
    RETURNING id
  `;
  adminId = admin.id;
});

beforeEach(async () => {
  await sql`DELETE FROM bookings WHERE room_id = ${roomId}`;
});

afterAll(async () => {
  await sql`DELETE FROM bookings WHERE room_id = ${roomId}`;
  await sql`DELETE FROM rooms WHERE id = ${roomId}`;
  await sql`DELETE FROM users WHERE id IN (${userAId}, ${userBId}, ${adminId})`;
  await sql.end();
});

describe("createBooking", () => {
  it("creates a booking on a free slot", async () => {
    const result = await createBooking({
      roomId,
      userId: userAId,
      date: "2030-01-01",
      startHour: 9,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects a second booking on the same room/date/slot (double-booking)", async () => {
    const first = await createBooking({
      roomId,
      userId: userAId,
      date: "2030-01-01",
      startHour: 9,
    });
    expect(first.ok).toBe(true);

    const second = await createBooking({
      roomId,
      userId: userBId,
      date: "2030-01-01",
      startHour: 9,
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.reason).toBe("conflict");
    }

    // The first (already existing) booking must be untouched.
    const rows = await sql<{ user_id: number }[]>`
      SELECT user_id FROM bookings
      WHERE room_id = ${roomId} AND date = '2030-01-01' AND start_hour = 9
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(userAId);
  });

  it("rejects a booking on a date that has already passed", async () => {
    const yesterday = addDays(todayISODate(), -1);

    const result = await createBooking({
      roomId,
      userId: userAId,
      date: yesterday,
      startHour: 9,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("past");
    }
  });

  it("allows the same user to book different slots on the same day", async () => {
    const first = await createBooking({
      roomId,
      userId: userAId,
      date: "2030-01-01",
      startHour: 9,
    });
    const second = await createBooking({
      roomId,
      userId: userAId,
      date: "2030-01-01",
      startHour: 10,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("lets an admin bump an existing booking and take the slot", async () => {
    const original = await createBooking({
      roomId,
      userId: userAId,
      date: "2030-01-04",
      startHour: 9,
    });
    expect(original.ok).toBe(true);

    const override = await createBooking({
      roomId,
      userId: adminId,
      date: "2030-01-04",
      startHour: 9,
      isAdmin: true,
    });
    expect(override.ok).toBe(true);

    const rows = await sql<{ user_id: number }[]>`
      SELECT user_id FROM bookings
      WHERE room_id = ${roomId} AND date = '2030-01-04' AND start_hour = 9
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe(adminId);
  });

  it("still rejects a past slot for an admin", async () => {
    const yesterday = addDays(todayISODate(), -1);

    const result = await createBooking({
      roomId,
      userId: adminId,
      date: yesterday,
      startHour: 9,
      isAdmin: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("past");
    }
  });
});

describe("cancelBooking", () => {
  it("refuses to cancel a booking that belongs to another user", async () => {
    const booking = await createBooking({
      roomId,
      userId: userAId,
      date: "2030-01-02",
      startHour: 10,
    });
    if (!booking.ok) throw new Error("test setup failed");

    const result = await cancelBooking({
      bookingId: booking.id,
      userId: userBId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("forbidden");
    }

    const stillThere = await sql<{ id: number }[]>`
      SELECT id FROM bookings WHERE id = ${booking.id}
    `;
    expect(stillThere).toHaveLength(1);
  });

  it("lets the owner cancel their own booking", async () => {
    const booking = await createBooking({
      roomId,
      userId: userAId,
      date: "2030-01-03",
      startHour: 11,
    });
    if (!booking.ok) throw new Error("test setup failed");

    const result = await cancelBooking({
      bookingId: booking.id,
      userId: userAId,
    });

    expect(result.ok).toBe(true);

    const rows = await sql<{ id: number }[]>`
      SELECT id FROM bookings WHERE id = ${booking.id}
    `;
    expect(rows).toHaveLength(0);
  });

  it("returns not_found for a booking that doesn't exist", async () => {
    const result = await cancelBooking({ bookingId: 999999999, userId: userAId });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_found");
    }
  });
});
