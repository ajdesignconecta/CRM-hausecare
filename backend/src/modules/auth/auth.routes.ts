import { z } from "zod";
import bcrypt from "bcryptjs";
import { FastifyInstance } from "fastify";
import { AppError } from "../../lib/errors.js";
import { env, isProduction } from "../../lib/env.js";
import {
  formatBrazilianPhone,
  generateResetToken,
  hashResetToken,
  normalizeDigits
} from "../../lib/utils.js";

const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(180),
  responsibleName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z
    .string()
    .trim()
    .min(10, "Telefone obrigatÃ³rio")
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone invÃ¡lido"),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(8),
  password: z.string().min(8).max(72)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72)
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(10, "Telefone obrigatorio")
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone invalido"),
  avatar_url: z
    .string()
    .trim()
    .max(10_000_000)
    .refine(
      (value) => value.length === 0 || /^https?:\/\//i.test(value) || /^data:image\/[a-zA-Z+.-]+;base64,/i.test(value),
      "Avatar invalido"
    )
    .nullable()
    .optional()
    .or(z.literal(""))
});

const buildSessionPayload = (user: { id: string; organization_id: string; email: string }) => ({
  sub: user.id,
  organizationId: user.organization_id,
  email: user.email
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const payload = registerSchema.parse(request.body);
    const client = await app.db.connect();

    try {
      await client.query("BEGIN");

      const email = payload.email.toLowerCase();
      const existing = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
      if (existing.rowCount) {
        throw new AppError("Email jÃ¡ cadastrado", 409);
      }

      const organizationName = payload.companyName.trim();
      const phoneDigits = normalizeDigits(payload.phone);
      const phone = formatBrazilianPhone(phoneDigits);

      const orgResult = await client.query(
        `INSERT INTO organizations (name)
         VALUES ($1)
         RETURNING id`,
        [organizationName]
      );

      const organizationId = orgResult.rows[0].id as string;
      const passwordHash = await bcrypt.hash(payload.password, 12);

      let userResult;
      try {
        userResult = await client.query(
          `INSERT INTO users (organization_id, name, responsible_name, company_name, email, phone, phone_digits, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, organization_id, email`,
          [
            organizationId,
            payload.responsibleName.trim(),
            payload.responsibleName.trim(),
            payload.companyName.trim(),
            email,
            phone,
            phoneDigits,
            passwordHash
          ]
        );
      } catch (error: any) {
        if (error?.code !== "42703") throw error;
        userResult = await client.query(
          `INSERT INTO users (organization_id, name, email, phone, phone_digits, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, organization_id, email`,
          [organizationId, payload.responsibleName.trim(), email, phone, phoneDigits, passwordHash]
        );
      }

      await client.query("COMMIT");

      const user = userResult.rows[0] as { id: string; organization_id: string; email: string };
      const token = await reply.jwtSign(buildSessionPayload(user));

      reply
        .setCookie(env.COOKIE_NAME, token, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7
        })
        .code(201)
        .send({ message: "Conta criada com sucesso" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  app.post(
    "/api/auth/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const payload = loginSchema.parse(request.body);

      const result = await app.db.query(
        `SELECT id, organization_id, email, password_hash
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [payload.email.toLowerCase()]
      );

      if (!result.rowCount) {
        throw new AppError("Credenciais invÃ¡lidas", 401);
      }

      const user = result.rows[0] as {
        id: string;
        organization_id: string;
        email: string;
        password_hash: string;
      };

      const validPassword = await bcrypt.compare(payload.password, user.password_hash);
      if (!validPassword) {
        throw new AppError("Credenciais invÃ¡lidas", 401);
      }

      const token = await reply.jwtSign(buildSessionPayload(user));
      reply
        .setCookie(env.COOKIE_NAME, token, {
          path: "/",
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7
        })
        .send({ message: "Login realizado com sucesso" });
    }
  );

  app.post("/api/auth/logout", async (_request, reply) => {
    reply
      .clearCookie(env.COOKIE_NAME, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction
      })
      .send({ message: "Logout realizado" });
  });

  app.post("/api/auth/forgot-password", async (request) => {
    const payload = forgotPasswordSchema.parse(request.body);

    const userResult = await app.db.query(
      `SELECT id, email
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [payload.email.toLowerCase()]
    );

    if (!userResult.rowCount) {
      return { message: "Se o email existir, enviaremos as instruÃ§Ãµes." };
    }

    const user = userResult.rows[0] as { id: string; email: string };
    const { rawToken, tokenHash } = generateResetToken();

    await app.db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + ($3::text || ' minutes')::interval)`,
      [user.id, tokenHash, env.RESET_TOKEN_TTL_MINUTES]
    );

    const resetUrl = `${env.APP_BASE_URL}/auth/reset-password?token=${rawToken}`;

    return {
      message: "Se o email existir, enviaremos as instruÃ§Ãµes.",
      resetUrl
    };
  });

  app.post("/api/auth/reset-password", async (request) => {
    const payload = resetPasswordSchema.parse(request.body);
    const tokenHash = hashResetToken(payload.token);

    const client = await app.db.connect();

    try {
      await client.query("BEGIN");

      const tokenResult = await client.query(
        `SELECT id, user_id
         FROM password_reset_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [tokenHash]
      );

      if (!tokenResult.rowCount) {
        throw new AppError("Token invÃ¡lido ou expirado", 400);
      }

      const token = tokenResult.rows[0] as { id: string; user_id: string };
      const passwordHash = await bcrypt.hash(payload.password, 12);

      await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
        passwordHash,
        token.user_id
      ]);

      await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [token.id]);

      await client.query("COMMIT");
      return { message: "Senha redefinida com sucesso" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });

  app.put(
    "/api/auth/change-password",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const payload = changePasswordSchema.parse(request.body);

      const result = await app.db.query(
        `SELECT id, password_hash
         FROM users
         WHERE id = $1
         LIMIT 1`,
        [request.user.sub]
      );

      if (!result.rowCount) {
        throw new AppError("UsuÃ¡rio nÃ£o encontrado", 404);
      }

      const user = result.rows[0] as { id: string; password_hash: string };
      const validPassword = await bcrypt.compare(payload.currentPassword, user.password_hash);
      if (!validPassword) {
        throw new AppError("Senha atual invÃ¡lida", 401);
      }

      const passwordHash = await bcrypt.hash(payload.newPassword, 12);
      await app.db.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
        passwordHash,
        user.id
      ]);

      return { message: "Senha alterada com sucesso" };
    }
  );

  app.put(
    "/api/auth/me",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const payload = updateProfileSchema.parse(request.body);
      const phoneDigits = normalizeDigits(payload.phone);
      const phone = formatBrazilianPhone(phoneDigits);
      const avatarUrl = payload.avatar_url ? payload.avatar_url : null;
      let result;
      try {
        result = await app.db.query(
          `WITH updated AS (
             UPDATE users
             SET name = $1,
                 phone = $2,
                 phone_digits = $3,
                 avatar_url = $4,
                 updated_at = NOW()
             WHERE id = $5
             RETURNING id, name, email, phone, avatar_url, organization_id
           )
           SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.organization_id, o.name AS organization_name
           FROM updated u
           JOIN organizations o ON o.id = u.organization_id`,
          [payload.name.trim(), phone, phoneDigits, avatarUrl, request.user.sub]
        );
      } catch (error: any) {
        if (error?.code !== "42703") throw error;

        result = await app.db.query(
          `WITH updated AS (
             UPDATE users
             SET name = $1,
                 phone = $2,
                 phone_digits = $3,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING id, name, email, phone, organization_id
           )
           SELECT u.id, u.name, u.email, u.phone, u.organization_id, o.name AS organization_name
           FROM updated u
           JOIN organizations o ON o.id = u.organization_id`,
          [payload.name.trim(), phone, phoneDigits, request.user.sub]
        );
        result.rows = result.rows.map((row: any) => ({ ...row, avatar_url: null }));
      }

      if (!result.rowCount) {
        throw new AppError("UsuÃƒÂ¡rio nÃƒÂ£o encontrado", 404);
      }

      return result.rows[0];
    }
  );

  app.get(
    "/api/auth/me",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      let result;
      try {
        result = await app.db.query(
          `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.role, u.organization_id, o.name AS organization_name
           FROM users u
           LEFT JOIN organizations o ON o.id = u.organization_id
           WHERE u.id = $1
           LIMIT 1`,
          [request.user.sub]
        );
      } catch (error: any) {
        // Fallback only for older schemas without avatar_url.
        if (error?.code !== "42703") throw error;

        result = await app.db.query(
          `SELECT u.id, u.name, u.email, u.phone, u.role, u.organization_id, o.name AS organization_name
           FROM users u
           LEFT JOIN organizations o ON o.id = u.organization_id
           WHERE u.id = $1
           LIMIT 1`,
          [request.user.sub]
        );
        result.rows = result.rows.map((row: any) => ({ ...row, avatar_url: null }));
      }

      if (!result.rowCount) {
        throw new AppError("UsuÃ¡rio nÃ£o encontrado", 404);
      }

      const user = result.rows[0] as {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
        avatar_url?: string | null;
        role?: string | null;
        organization_id: string;
        organization_name?: string | null;
      };

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? "",
        avatar_url: user.avatar_url ?? null,
        role: user.role ?? "admin",
        organization_id: user.organization_id,
        organization_name: user.organization_name ?? "Organizacao"
      };
    }
  );
}

