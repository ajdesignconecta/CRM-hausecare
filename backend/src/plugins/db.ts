import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { pool } from "../lib/db.js";
import { env } from "../lib/env.js";

export const dbPlugin = fp(async (app: FastifyInstance) => {
  app.decorate("db", pool);

  if (env.RUN_STARTUP_PATCHES) {
    app.log.warn("RUN_STARTUP_PATCHES=true: executando patches de compatibilidade no startup.");
    // Compatibilidade legada para ambientes sem todas as migrations aplicadas.
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'admin'");
    await pool.query("UPDATE users SET role = 'admin' WHERE role IS NULL OR role = ''");
    await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperature varchar(10)");
    await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value numeric(12,2)");
    await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS closed_at date");
    await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason varchar(240)");
    await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action_date date");
    await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action_note text");
  }

  app.addHook("onClose", async () => {
    await pool.end();
  });
});
