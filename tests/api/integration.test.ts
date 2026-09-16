import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { sql } from "@/lib/db";
import { encrypt } from "@/lib/session";

// Full HTTP integration suite: a real `next dev` server, a real Postgres
// (the dedicated test database), real fetch() calls — no mocking. Covers
// the four things a manual test report checks for a web app: a real user
// journey (Parcours), the error paths (Erreurs), the access-control
// boundaries (Accès), and — see lib/bookings.test.ts's admin-override
// tests plus README's incident drill — the rest of the coverage matrix.

let serverProcess: ChildProcess;
let baseUrl: string;
let roomId: number;
let userAId: number;
let userBId: number;
let studentId: number;
let superAdminId: number;
let tokenA: string;
let tokenB: string;
let studentToken: string;
let superAdminToken: string;

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        reject(new Error("Could not determine a free port"));
      }
    });
    server.on("error", reject);
  });
}

async function waitForServer(url: string, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(url, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

beforeAll(async () => {
  const [room] = await sql<{ id: number }[]>`
    INSERT INTO rooms (name, capacity) VALUES ('Integration Test Room', 10)
    RETURNING id
  `;
  roomId = room.id;

  const [userA] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash)
    VALUES ('API User A', 'api-user-a@test.local', 'hash')
    RETURNING id
  `;
  userAId = userA.id;

  const [userB] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash)
    VALUES ('API User B', 'api-user-b@test.local', 'hash')
    RETURNING id
  `;
  userBId = userB.id;

  const [student] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Integration Student', 'integration-student@test.local', 'hash', 'student')
    RETURNING id
  `;
  studentId = student.id;

  const [superAdmin] = await sql<{ id: number }[]>`
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Integration Superadmin', 'integration-superadmin@test.local', 'hash', 'superadmin')
    RETURNING id
  `;
  superAdminId = superAdmin.id;

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  tokenA = await encrypt({ userId: userAId, expiresAt });
  tokenB = await encrypt({ userId: userBId, expiresAt });
  studentToken = await encrypt({ userId: studentId, expiresAt });
  superAdminToken = await encrypt({ userId: superAdminId, expiresAt });

  const port = await getFreePort();
  baseUrl = `http://localhost:${port}`;

  // Real HTTP server, running the actual route handlers, isolated on the
  // test database via NODE_ENV=test (Next.js loads .env.test, see
  // environment-variables.md "Test Environment Variables").
  serverProcess = spawn("npx", ["next", "dev", "--port", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test", NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "ignore",
  });

  await waitForServer(`${baseUrl}/login`);
}, 40000);

afterAll(async () => {
  serverProcess?.kill();
  await sql`DELETE FROM bookings WHERE room_id = ${roomId}`;
  await sql`DELETE FROM rooms WHERE id = ${roomId}`;
  await sql`DELETE FROM users WHERE id IN (${userAId}, ${userBId}, ${studentId}, ${superAdminId})`;
  await sql.end();
});

describe("Parcours — réserver, retrouver dans « Mes réservations », annuler", () => {
  it("une réservation créée apparaît dans /reservations puis en disparaît après annulation", async () => {
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session=${studentToken}` },
      body: JSON.stringify({ roomId, date: "2031-07-10", startHour: 9 }),
    });
    expect(createRes.status).toBe(201);
    const { id: bookingId } = await createRes.json();

    const pageWithBooking = await fetch(`${baseUrl}/reservations`, {
      headers: { Cookie: `session=${studentToken}` },
    });
    const htmlWithBooking = await pageWithBooking.text();
    expect(htmlWithBooking).toContain("Integration Test Room");

    const cancelRes = await fetch(`${baseUrl}/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { Cookie: `session=${studentToken}` },
    });
    expect(cancelRes.status).toBe(204);

    const pageAfterCancel = await fetch(`${baseUrl}/reservations`, {
      headers: { Cookie: `session=${studentToken}` },
    });
    const htmlAfterCancel = await pageAfterCancel.text();
    expect(htmlAfterCancel).not.toContain("Integration Test Room");
    expect(htmlAfterCancel).toContain("Aucune réservation à venir");
  });
});

describe("Erreurs — /api/bookings", () => {
  it("refuse un corps de requête invalide (400)", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session=${studentToken}` },
      body: JSON.stringify({ roomId: "not-a-number" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_body");
  });

  it("refuse de réserver un créneau déjà passé (400)", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session=${studentToken}` },
      body: JSON.stringify({ roomId, date: "2020-01-01", startHour: 9 }),
    });
    expect(res.status).toBe(400);
  });

  it("refuse un double-booking sur le même créneau (409), sans écraser le premier", async () => {
    const first = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session=${studentToken}` },
      body: JSON.stringify({ roomId, date: "2031-08-20", startHour: 11 }),
    });
    expect(first.status).toBe(201);

    const second = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session=${tokenA}` },
      body: JSON.stringify({ roomId, date: "2031-08-20", startHour: 11 }),
    });
    expect(second.status).toBe(409);
  });
});

describe("Accès — pages protégées et actions autorisées", () => {
  it("redirige une page protégée vers /login sans session (307)", async () => {
    const res = await fetch(`${baseUrl}/`, { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("redirige /admin vers /login sans session (307)", async () => {
    const res = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("redirige /admin vers / pour un compte student authentifié (307)", async () => {
    const res = await fetch(`${baseUrl}/admin`, {
      redirect: "manual",
      headers: { Cookie: `session=${studentToken}` },
    });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/");
  });

  it("laisse passer /admin pour un compte superadmin (200)", async () => {
    const res = await fetch(`${baseUrl}/admin`, {
      headers: { Cookie: `session=${superAdminToken}` },
    });
    expect(res.status).toBe(200);
  });

  it("refuse de créer une réservation sans session (401)", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, date: "2031-09-01", startHour: 9 }),
    });
    expect(res.status).toBe(401);
  });

  it("refuse d'annuler la réservation d'un autre utilisateur (403), mais l'autorise au propriétaire (204)", async () => {
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `session=${tokenA}` },
      body: JSON.stringify({ roomId, date: "2031-05-01", startHour: 9 }),
    });
    expect(createRes.status).toBe(201);
    const { id: bookingId } = await createRes.json();

    const cancelAsOtherUser = await fetch(`${baseUrl}/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { Cookie: `session=${tokenB}` },
    });
    expect(cancelAsOtherUser.status).toBe(403);

    const stillThere = await sql<{ id: number }[]>`
      SELECT id FROM bookings WHERE id = ${bookingId}
    `;
    expect(stillThere).toHaveLength(1);

    const cancelAsOwner = await fetch(`${baseUrl}/api/bookings/${bookingId}`, {
      method: "DELETE",
      headers: { Cookie: `session=${tokenA}` },
    });
    expect(cancelAsOwner.status).toBe(204);
  });

  it("refuse d'annuler sans session (401)", async () => {
    const res = await fetch(`${baseUrl}/api/bookings/1`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });
});
