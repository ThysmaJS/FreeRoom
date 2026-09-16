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

  const rows = await sql<
    { id: number; name: string; email: string; is_admin: boolean }[]
  >`
    SELECT id, name, email, is_admin FROM users WHERE id = ${session.userId}
  `;

  const user = rows[0];
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, isAdmin: user.is_admin };
});

export const getOptionalUser = cache(async () => {
  const userId = await getOptionalUserId();
  if (!userId) return null;

  const rows = await sql<{ id: number; is_admin: boolean }[]>`
    SELECT id, is_admin FROM users WHERE id = ${userId}
  `;

  const user = rows[0];
  if (!user) return null;
  return { id: user.id, isAdmin: user.is_admin };
});
