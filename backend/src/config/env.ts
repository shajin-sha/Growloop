import "dotenv/config";

import { z } from "zod";

const booleanEnv = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4100),
  DATABASE_URL: z.string().min(1),
  DATABASE_SCHEMA: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).default("public"),
  DATABASE_SSL: booleanEnv.default("false"),
  DATABASE_SSL_REJECT_UNAUTHORIZED: booleanEnv.default("true"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY_PATH: z.string().optional(),
  GITHUB_APP_INSTALLATION_ID: z.string().optional(),
  GITHUB_APP_WEBHOOK_SECRET: z.string().optional(),
  E2B_API_KEY: z.string().optional(),
  CODEX_COMMAND: z.string().default("codex")
});

export const env = envSchema.parse(process.env);
