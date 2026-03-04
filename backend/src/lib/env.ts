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
  JWT_SECRET: z.string().min(8),
  COOKIE_NAME: z.string().default("crm_session"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  RESET_TOKEN_TTL_MINUTES: z.coerce.number().default(60)
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
