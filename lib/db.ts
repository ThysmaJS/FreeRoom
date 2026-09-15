import postgres from "postgres";

const globalForSql = globalThis as unknown as {
  sql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForSql.sql ?? postgres(process.env.DATABASE_URL!, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForSql.sql = sql;
}
