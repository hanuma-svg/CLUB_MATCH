import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

// Ensure .env is parsed even if process.loadEnvFile is absent or fails
function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("DATABASE_URL=")) {
          let val = trimmed.slice("DATABASE_URL=".length).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          return val;
        }
      }
    }
  } catch {}
  return undefined;
}

async function run() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Configure .env before applying SQL objects.");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector;");
    const files = ["views.sql", "triggers.sql", "indexes.sql"];

    for (const file of files) {
      const fullPath = path.join(process.cwd(), "database", "sql", file);
      const sql = fs.readFileSync(fullPath, "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
    }

    console.log("Applying CHECK constraints...");
    await client.query(`
      ALTER TABLE students DROP CONSTRAINT IF EXISTS chk_students_semester;
      ALTER TABLE students ADD CONSTRAINT chk_students_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 8));
      ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_capacity;
      ALTER TABLE events ADD CONSTRAINT chk_events_capacity CHECK (max_capacity > 0 AND current_registrations >= 0 AND current_registrations <= max_capacity);
      ALTER TABLE events DROP CONSTRAINT IF EXISTS chk_events_deadline;
      ALTER TABLE events ADD CONSTRAINT chk_events_deadline CHECK (registration_deadline <= event_date);
    `);

    console.log("All PostgreSQL views, triggers, indexes, and constraints applied successfully.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Failed to apply SQL objects:", err);
  process.exit(1);
});
