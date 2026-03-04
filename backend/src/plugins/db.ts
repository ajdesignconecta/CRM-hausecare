import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { pool } from "../lib/db.js";

export const dbPlugin = fp(async (app: FastifyInstance) => {
  app.decorate("db", pool);

  app.addHook("onClose", async () => {
    await pool.end();
  });
});
