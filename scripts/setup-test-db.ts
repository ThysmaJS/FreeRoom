import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const testUrl = process.env.DATABASE_URL;
  if (!testUrl) {
    throw new Error("DATABASE_URL is not set (expected .env.test to be loaded)");
  }

  const dbName = new URL(testUrl).pathname.replace(/^\//, "");
  const adminUrl = testUrl.replace(`/${dbName}`, "/postgres");

  const admin = postgres(adminUrl, { max: 1 });
  const existing = await admin<{ exists: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${dbName}) AS exists
  `;
  if (!existing[0].exists) {
    await admin.unsafe(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}".`);
  }
  await admin.end();

  const testDb = postgres(testUrl, { max: 1 });
  const schema = readFileSync(join(__dirname, "../db/schema.sql"), "utf-8");
  await testDb.unsafe(schema);
  await testDb.end();
  console.log("Test database schema applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
