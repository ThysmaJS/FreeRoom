import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { sql } from "@/lib/db";
import type { UserRole } from "@/lib/roles";
import AppHeader from "../app-header";
import RoleSelect from "./role-select";

export default async function AdminDashboard() {
  const user = await getUser();
  if (!user?.isSuperAdmin) {
    redirect("/");
  }

  const users = await sql<
    { id: number; name: string; email: string; role: UserRole }[]
  >`
    SELECT id, name, email, role FROM users ORDER BY name ASC
  `;

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader userName={user.name} active="admin" role={user.role} />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          <h1 className="text-xl font-black">Utilisateurs</h1>
          <p className="text-sm text-muted">
            {users.length} compte{users.length > 1 ? "s" : ""}
          </p>
        </div>

        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-col gap-3 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
            >
              <div className="min-w-0">
                <p className="truncate font-black">
                  {u.name}
                  {u.id === user.id && (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      (toi)
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted">{u.email}</p>
              </div>
              <div className="w-full shrink-0 sm:w-44">
                <RoleSelect
                  userId={u.id}
                  initialRole={u.role}
                  disabled={u.id === user.id}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
