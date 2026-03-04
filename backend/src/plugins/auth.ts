import fp from "fastify-plugin";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import { env } from "../lib/env.js";

export const authPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cookie);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: env.COOKIE_NAME,
      signed: false
    },
    sign: {
      expiresIn: "7d"
    }
  });

  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ message: "Não autenticado" });
    }
  });
});
