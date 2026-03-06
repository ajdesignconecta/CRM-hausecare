import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { dbPlugin } from "./plugins/db.js";
import { authPlugin } from "./plugins/auth.js";
import { env } from "./lib/env.js";
import { AppError } from "./lib/errors.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { leadsRoutes } from "./modules/leads/leads.routes.js";
import { alertsRoutes } from "./modules/alerts/alerts.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true,
    disableRequestLogging: true,
    bodyLimit: 12 * 1024 * 1024
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW
  });

  await app.register(dbPlugin);
  await app.register(authPlugin);

  app.get("/health", async () => ({ ok: true }));
  app.get("/api/diag/db", async () => {
    const ping = await app.db.query("SELECT 1 as ok");
    return { ok: ping.rows[0]?.ok === 1 };
  });
  app.get("/api/diag/env-db", async () => {
    try {
      const parsed = new URL(env.DATABASE_URL);
      const maskedUser =
        parsed.username.length <= 3
          ? `${parsed.username[0] ?? "*"}***`
          : `${parsed.username.slice(0, 2)}***${parsed.username.slice(-2)}`;
      return {
        protocol: parsed.protocol,
        host: parsed.host,
        database: parsed.pathname,
        user_masked: maskedUser,
        hasPassword: parsed.password.length > 0
      };
    } catch (error: any) {
      return {
        invalid: true,
        message: error?.message ?? "Invalid URL"
      };
    }
  });

  await authRoutes(app);
  await leadsRoutes(app);
  await alertsRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: "Dados invalidos", issues: error.issues });
    }

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ message: error.message });
    }

    console.error("[backend-unhandled-error]", {
      message: (error as any)?.message,
      stack: (error as any)?.stack,
      code: (error as any)?.code
    });
    app.log.error(error);
    return reply.code(500).send({
      message: "Erro interno do servidor",
      code: (error as any)?.code ?? "INTERNAL_ERROR"
    });
  });

  return app;
}
