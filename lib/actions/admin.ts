"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/dal";
import { isValidRole } from "@/lib/roles";

type SetUserRoleResult = { ok: true } | { ok: false; error: string };

export async function setUserRole(
  userId: number,
  role: string
): Promise<SetUserRoleResult> {
  const currentUser = await getUser();
  if (!currentUser?.isSuperAdmin) {
    return { ok: false, error: "Accès refusé." };
  }
  if (!isValidRole(role)) {
    return { ok: false, error: "Rôle invalide." };
  }
  if (userId === currentUser.id) {
    return { ok: false, error: "Impossible de modifier ton propre rôle." };
  }

  await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`;
  revalidatePath("/admin");
  return { ok: true };
}
