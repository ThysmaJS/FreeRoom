import { sql } from "../lib/db";
import { VALID_ROLES, isValidRole } from "../lib/roles";

// Manual, backend-only way to bootstrap the first superadmin — there's no
// self-service way to grant this from the app itself, on purpose. Once a
// superadmin exists, further role changes go through the /admin dashboard.
// Usage:
//   npx tsx scripts/set-role.ts someone@esgi.fr superadmin

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !role || !isValidRole(role)) {
    console.error(
      `Usage: tsx scripts/set-role.ts <email> <${VALID_ROLES.join("|")}>`
    );
    process.exit(1);
  }

  const rows = await sql<{ id: number; name: string }[]>`
    UPDATE users SET role = ${role}
    WHERE email = ${email}
    RETURNING id, name
  `;

  if (rows.length === 0) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  console.log(`"${rows[0].name}" (${email}) is now "${role}".`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
