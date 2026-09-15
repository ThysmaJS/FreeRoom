import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { sql } from "@/lib/db";
import { encrypt } from "@/lib/session";

let serverProcess: ChildProcess;
let baseUrl: string;
let roomId: number;
let userAId: number;
let userBId: number;
let tokenA: string;
let tokenB: string;

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
    INSERT INTO rooms (name, capacity) VALUES ('API Test Room', 10)
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

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  tokenA = await encrypt({ userId: userAId, expiresAt });
  tokenB = await encrypt({ userId: userBId, expiresAt });

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
  await sql`DELETE FROM users WHERE id IN (${userAId}, ${userBId})`;
  await sql.end();
});

describe("DELETE /api/bookings/[id]", () => {
  it("refuses to cancel a booking that belongs to another user (403), and allows the owner to (204)", async () => {
    const createRes = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${tokenA}`,
      },
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

  it("returns 401 when no session cookie is sent", async () => {
    const res = await fetch(`${baseUrl}/api/bookings/1`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });
});
