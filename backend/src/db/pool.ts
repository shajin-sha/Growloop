import pg from "pg";

import { env } from "../config/env";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  options: `-c search_path=${env.DATABASE_SCHEMA}`,
  ssl: env.DATABASE_SSL
    ? {
        rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED
      }
    : undefined
});

export type DbPool = Pick<pg.Pool, "query" | "connect">;
