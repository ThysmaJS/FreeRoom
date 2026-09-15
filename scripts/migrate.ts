import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "../lib/db";

async function main() {
  const schema = readFileSync(join(__dirname, "../db/schema.sql"), "utf-8");
  await sql.unsafe(schema);
  console.log("Schema applied.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
