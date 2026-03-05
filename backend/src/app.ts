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

  await authRoutes(app);
  await leadsRoutes(app);
  await alertsRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: "Dados inválidos", issues: error.issues });
    }

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ message: error.message });
    }

    app.log.error(error);
    return reply.code(500).send({ message: "Erro interno do servidor" });
  });

  return app;
}
