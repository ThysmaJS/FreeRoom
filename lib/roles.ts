// Deliberately no "server-only" guard here (unlike lib/dal.ts) — this needs
// to be importable from client components (the role picker) and from
// standalone scripts (set-role.ts) run outside the Next.js runtime.

export type UserRole = "student" | "admin" | "superadmin";

export const ROLES: { value: UserRole; label: string }[] = [
  { value: "student", label: "Étudiant" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Superadmin" },
];

export const VALID_ROLES: readonly UserRole[] = ROLES.map((r) => r.value);

export function isValidRole(role: string): role is UserRole {
  return (VALID_ROLES as readonly string[]).includes(role);
}
