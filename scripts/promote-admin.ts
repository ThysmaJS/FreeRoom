import { sql } from "../lib/db";

// Manual, backend-only way to grant admin rights — there's no self-service
// signup flag for this on purpose. Usage:
//   npx tsx scripts/promote-admin.ts someone@esgi.fr

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx scripts/promote-admin.ts <email>");
    process.exit(1);
  }

  const rows = await sql<{ id: number; name: string }[]>`
    UPDATE users SET is_admin = true
    WHERE email = ${email}
    RETURNING id, name
  `;

  if (rows.length === 0) {
    console.error(`No user found with email "${email}".`);
    process.exit(1);
  }

  console.log(`"${rows[0].name}" (${email}) is now an admin.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
