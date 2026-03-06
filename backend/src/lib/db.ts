import { Pool } from "pg";
import { env } from "../lib/env.js";

const looksLikeSupabase = /supabase\.(co|com)/i.test(env.DATABASE_URL);
const useSsl = typeof env.DB_SSL === "boolean" ? env.DB_SSL : looksLikeSupabase;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS,
  maxUses: env.DB_POOL_MAX_USES
});
