import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
const migrationDir = path.join(process.cwd(), "database", "migrations");

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  const files = (await readdir(migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const [existing] = await sql`
      SELECT name FROM schema_migrations WHERE name = ${file}
    `;
    if (existing) continue;
    const contents = await readFile(path.join(migrationDir, file), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(contents);
      await transaction`
        INSERT INTO schema_migrations (name) VALUES (${file})
      `;
    });
    console.log(`Applied ${file}`);
  }
  console.log("Database is up to date.");
} finally {
  await sql.end();
}
