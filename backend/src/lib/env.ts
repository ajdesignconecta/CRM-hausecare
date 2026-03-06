import dotenv from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), "..", ".env"), override: false });

if (!process.env.DATABASE_URL && process.env.SUPABASE_DB_URL) {
  process.env.DATABASE_URL = process.env.SUPABASE_DB_URL;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  DB_POOL_MAX_USES: z.coerce.number().int().positive().default(7_500),
  DB_SSL: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
    .optional(),
  AUTH_ANTIBOT_MODE: z.enum(["off", "log", "enforce"]).default("off"),
  TURNSTILE_SECRET: z.string().optional(),
  AUTH_MAGIC_LINK_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_MFA_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  AUTH_DEV_EXPOSE_SECRETS: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
    .default(false),
  RUN_STARTUP_PATCHES: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
    .default(false),
  JWT_SECRET: z.string().min(8),
  COOKIE_NAME: z.string().default("crm_session"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_WINDOW: z.string().default("1 minute")
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
