import type { Pool } from "pg";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      organizationId: string;
      email: string;
    };
    user: {
      sub: string;
      organizationId: string;
      email: string;
    };
  }
}
