import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";
import { sql } from "@/lib/db";
import type { UserRole } from "@/lib/roles";

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
    { id: number; name: string; email: string; role: UserRole }[]
  >`
    SELECT id, name, email, role FROM users WHERE id = ${session.userId}
  `;

  const user = rows[0];
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.role === "admin" || user.role === "superadmin",
    isSuperAdmin: user.role === "superadmin",
  };
});

export const getOptionalUser = cache(async () => {
  const userId = await getOptionalUserId();
  if (!userId) return null;

  const rows = await sql<{ id: number; role: UserRole }[]>`
    SELECT id, role FROM users WHERE id = ${userId}
  `;

  const user = rows[0];
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    isAdmin: user.role === "admin" || user.role === "superadmin",
  };
});
