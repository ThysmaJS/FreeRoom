import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";
import { sql } from "@/lib/db";

export const verifySession = cache(async () => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);

  if (!session?.userId) {
    redirect("/login");
  }

  return { isAuth: true, userId: session.userId };
});

export const getOptionalUserId = cache(async () => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);
  return session?.userId ?? null;
});

export const getUser = cache(async () => {
  const session = await verifySession();

  const rows = await sql<{ id: number; name: string; email: string }[]>`
    SELECT id, name, email FROM users WHERE id = ${session.userId}
  `;

  return rows[0] ?? null;
});
