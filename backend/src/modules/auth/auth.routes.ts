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

const magicLinkRequestSchema = z.object({
  email: z.string().trim().email()
});

const magicLinkVerifySchema = z.object({
  token: z.string().min(8)
});

const onboardingStatusSchema = z.object({
  completed: z.boolean(),
  step: z.coerce.number().int().min(1).max(5).optional()
});

const mfaSettingsSchema = z.object({
  enabled: z.boolean()
});

const shouldExposeSecrets = env.AUTH_DEV_EXPOSE_SECRETS || !isProduction;

async function verifyAntiBot(request: any) {
  const mode = env.AUTH_ANTIBOT_MODE;
  if (mode === "off") return;

  const body = (request.body ?? {}) as Record<string, unknown>;
  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot.length > 0) {
    throw new AppError("Validacao anti-bot bloqueou a solicitacao", 400);
  }

  const token = (typeof body.turnstileToken === "string" ? body.turnstileToken : undefined) || (request.headers["x-turnstile-token"] as string | undefined);
  if (!token) {
    if (mode === "enforce") throw new AppError("Validacao anti-bot obrigatoria", 400);
    return;
  }

  if (!env.TURNSTILE_SECRET) {
    if (mode === "enforce") throw new AppError("Servidor sem segredo anti-bot", 500);
    return;
  }

  const form = new URLSearchParams();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  form.set("remoteip", request.ip ?? "");

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  const result = (await response.json()) as { success?: boolean };
  if (!result.success && mode === "enforce") {
    throw new AppError("Falha na validacao anti-bot", 400);
  }
}

async function logAuthEvent(
  app: FastifyInstance,
  request: any,
  payload: {
    eventType: string;
    status: "success" | "failure";
    latencyMs: number;
    email?: string;
    userId?: string;
    organizationId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await app.db.query(
      `INSERT INTO auth_audit_events
         (event_type, status, latency_ms, email, user_id, organization_id, ip, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        payload.eventType,
        payload.status,
        payload.latencyMs,
        payload.email ?? null,
        payload.userId ?? null,
        payload.organizationId ?? null,
        request.ip ?? null,
        request.headers["user-agent"] ?? null,
        payload.metadata ? JSON.stringify(payload.metadata) : null
      ]
    );
  } catch (error: any) {
    if (error?.code === "42P01") return;
    request.log.warn({ err: error }, "auth_audit_events insert failed");
  }
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const start = Date.now();
    await verifyAntiBot(request);
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
      await logAuthEvent(app, request, {
        eventType: "register",
        status: "success",
        latencyMs: Date.now() - start,
        email: user.email,
        userId: user.id,
        organizationId: user.organization_id
      });
    } catch (error) {
      await client.query("ROLLBACK");
      await logAuthEvent(app, request, {
        eventType: "register",
        status: "failure",
        latencyMs: Date.now() - start,
        email: payload.email.toLowerCase()
      });
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
      const start = Date.now();
      await verifyAntiBot(request);
      const payload = loginSchema.parse(request.body);

      const result = await app.db.query(
        `SELECT id, organization_id, email, password_hash
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [payload.email.toLowerCase()]
      );

      if (!result.rowCount) {
        await logAuthEvent(app, request, {
          eventType: "login",
          status: "failure",
          latencyMs: Date.now() - start,
          email: payload.email.toLowerCase(),
          metadata: { reason: "user_not_found" }
        });
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
        await logAuthEvent(app, request, {
          eventType: "login",
          status: "failure",
          latencyMs: Date.now() - start,
          email: payload.email.toLowerCase(),
          userId: user.id,
          organizationId: user.organization_id,
          metadata: { reason: "invalid_password" }
        });
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
      await logAuthEvent(app, request, {
        eventType: "login",
        status: "success",
        latencyMs: Date.now() - start,
        email: user.email,
        userId: user.id,
        organizationId: user.organization_id
      });
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

  app.get(
    "/api/auth/onboarding-status",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      try {
        const result = await app.db.query(
          `SELECT onboarding_completed, onboarding_step
           FROM organizations
           WHERE id = $1
           LIMIT 1`,
          [request.user.organizationId]
        );
        if (!result.rowCount) return { completed: true, step: 5 };
        const row = result.rows[0] as { onboarding_completed: boolean; onboarding_step: number };
        return { completed: row.onboarding_completed, step: row.onboarding_step };
      } catch (error: any) {
        if (error?.code === "42703") return { completed: true, step: 5 };
        throw error;
      }
    }
  );

  app.put(
    "/api/auth/onboarding-status",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const payload = onboardingStatusSchema.parse(request.body);
      try {
        await app.db.query(
          `UPDATE organizations
           SET onboarding_completed = $1,
               onboarding_step = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [payload.completed, payload.step ?? (payload.completed ? 5 : 1), request.user.organizationId]
        );
      } catch (error: any) {
        if (error?.code === "42703") return { completed: true, step: 5 };
        throw error;
      }
      return { completed: payload.completed, step: payload.step ?? (payload.completed ? 5 : 1) };
    }
  );

  app.get(
    "/api/auth/mfa-settings",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      try {
        const result = await app.db.query(`SELECT mfa_enabled FROM users WHERE id = $1 LIMIT 1`, [request.user.sub]);
        return { enabled: Boolean(result.rows[0]?.mfa_enabled) };
      } catch (error: any) {
        if (error?.code === "42703") return { enabled: false };
        throw error;
      }
    }
  );

  app.put(
    "/api/auth/mfa-settings",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const payload = mfaSettingsSchema.parse(request.body);
      try {
        await app.db.query(`UPDATE users SET mfa_enabled = $1, updated_at = NOW() WHERE id = $2`, [payload.enabled, request.user.sub]);
      } catch (error: any) {
        if (error?.code === "42703") {
          throw new AppError("MigraÃ§Ã£o pendente: execute sql/migrations/010_auth_hardening.sql", 500);
        }
        throw error;
      }
      return { enabled: payload.enabled };
    }
  );

  app.post("/api/auth/forgot-password", async (request) => {
    const start = Date.now();
    await verifyAntiBot(request);
    const payload = forgotPasswordSchema.parse(request.body);

    const userResult = await app.db.query(
      `SELECT id, email
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [payload.email.toLowerCase()]
    );

    if (!userResult.rowCount) {
      await logAuthEvent(app, request, {
        eventType: "forgot_password",
        status: "success",
        latencyMs: Date.now() - start,
        email: payload.email.toLowerCase(),
        metadata: { userFound: false }
      });
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

    await logAuthEvent(app, request, {
      eventType: "forgot_password",
      status: "success",
      latencyMs: Date.now() - start,
      email: user.email,
      userId: user.id,
      metadata: { userFound: true }
    });

    return {
      message: "Se o email existir, enviaremos as instruÃ§Ãµes.",
      resetUrl
    };
  });

  app.post("/api/auth/magic-link/request", async (request) => {
    const start = Date.now();
    await verifyAntiBot(request);
    const payload = magicLinkRequestSchema.parse(request.body);

    const userResult = await app.db.query(
      `SELECT id, organization_id, email
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [payload.email.toLowerCase()]
    );

    if (!userResult.rowCount) {
      await logAuthEvent(app, request, {
        eventType: "magic_link_request",
        status: "success",
        latencyMs: Date.now() - start,
        email: payload.email.toLowerCase(),
        metadata: { userFound: false }
      });
      return { message: "Se o email existir, enviaremos o link de acesso." };
    }

    const user = userResult.rows[0] as { id: string; organization_id: string; email: string };
    const { rawToken, tokenHash } = generateResetToken();

    try {
      await app.db.query(
        `INSERT INTO auth_magic_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3::text || ' minutes')::interval)`,
        [user.id, tokenHash, env.AUTH_MAGIC_LINK_TTL_MINUTES]
      );
    } catch (error: any) {
      if (error?.code === "42P01") {
        throw new AppError("MigraÃ§Ã£o pendente: execute sql/migrations/010_auth_hardening.sql", 500);
      }
      throw error;
    }

    const loginUrl = `${env.APP_BASE_URL}/auth/magic-link/verify?token=${rawToken}`;
    await logAuthEvent(app, request, {
      eventType: "magic_link_request",
      status: "success",
      latencyMs: Date.now() - start,
      email: user.email,
      userId: user.id,
      organizationId: user.organization_id,
      metadata: { userFound: true }
    });

    return {
      message: "Link de acesso gerado com sucesso.",
      ...(shouldExposeSecrets ? { loginUrl } : {})
    };
  });

  app.post("/api/auth/magic-link/verify", async (request, reply) => {
    const start = Date.now();
    const payload = magicLinkVerifySchema.parse(request.body);
    const tokenHash = hashResetToken(payload.token);

    let tokenResult;
    try {
      tokenResult = await app.db.query(
        `SELECT id, user_id
         FROM auth_magic_tokens
         WHERE token_hash = $1
           AND used_at IS NULL
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [tokenHash]
      );
    } catch (error: any) {
      if (error?.code === "42P01") {
        throw new AppError("MigraÃ§Ã£o pendente: execute sql/migrations/010_auth_hardening.sql", 500);
      }
      throw error;
    }

    if (!tokenResult.rowCount) {
      await logAuthEvent(app, request, {
        eventType: "magic_link_verify",
        status: "failure",
        latencyMs: Date.now() - start,
        metadata: { reason: "token_invalid_or_expired" }
      });
      throw new AppError("Token invÃ¡lido ou expirado", 400);
    }

    const token = tokenResult.rows[0] as { id: string; user_id: string };

    const userResult = await app.db.query(
      `SELECT id, organization_id, email
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [token.user_id]
    );

    if (!userResult.rowCount) {
      throw new AppError("UsuÃ¡rio nÃ£o encontrado", 404);
    }

    await app.db.query("UPDATE auth_magic_tokens SET used_at = NOW() WHERE id = $1", [token.id]);

    const user = userResult.rows[0] as { id: string; organization_id: string; email: string };
    const signed = await reply.jwtSign(buildSessionPayload(user));
    reply
      .setCookie(env.COOKIE_NAME, signed, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7
      })
      .send({ message: "Login realizado com sucesso" });

    await logAuthEvent(app, request, {
      eventType: "magic_link_verify",
      status: "success",
      latencyMs: Date.now() - start,
      email: user.email,
      userId: user.id,
      organizationId: user.organization_id
    });
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

