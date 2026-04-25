import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { pool } from "../src/db/pool";
import { quoteIdentifier } from "../src/db/schema";
import { env } from "../src/config/env";
import { logger } from "../src/logger";

const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(currentDir, "..", "migrations");

async function migrate() {
  const migration = await readFile(join(migrationsDir, "001_init.sql"), "utf8");
  const schema = quoteIdentifier(env.DATABASE_SCHEMA);

  await pool.query(`create schema if not exists ${schema}`);
  await pool.query(`set search_path to ${schema}`);
  await pool.query(migration);

  logger.info("Database migration completed", {
    module: "database",
    schema: env.DATABASE_SCHEMA,
    migration: "001_init.sql"
  });
}

migrate()
  .catch((error) => {
    logger.error("Database migration failed", {
      module: "database",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
