import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import type { AppDeps } from "../app";
import { InMemoryUserRepository } from "../adapters/inMemoryAdapters";
import { toUserDto, type UserRepository } from "../ports/userRepository";
import { hashPin, signAuthToken, verifyAuthToken, verifyPin } from "../security";

const registerSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  email: z.string().trim().email("Correo electrónico inválido").max(200),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

const googleAuthSchema = z.object({
  /** Standard Google Identity Services ID token (JWT), when Google Client ID is configured */
  credential: z.string().optional(),
  /** Fallback / quick Google email sign-in when Google OAuth popup or credential is provided */
  email: z.string().trim().email().optional(),
  name: z.string().trim().optional(),
  picture: z.string().optional(),
  googleSub: z.string().optional(),
});

interface GoogleTokenInfo {
  sub: string;
  email: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
}

async function verifyGoogleIdToken(idToken: string, expectedClientId: string): Promise<GoogleTokenInfo> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!res.ok) {
    throw new Error("Token de Google inválido o expirado");
  }
  const info = (await res.json()) as GoogleTokenInfo;
  if (!info.email || !info.sub) {
    throw new Error("El token de Google no contiene un correo válido");
  }
  if (expectedClientId && info.aud && info.aud !== expectedClientId) {
    throw new Error("El token de Google no corresponde a este Client ID");
  }
  return info;
}

const fallbackUserRepo = new InMemoryUserRepository();

function getUserRepo(deps: AppDeps): UserRepository {
  return deps.userRepo ?? fallbackUserRepo;
}

function sendValidationError(reply: FastifyReply, error: z.ZodError) {
  const firstMsg =
    error.issues[0]?.message ?? "Verifica los datos ingresados";
  return reply.status(400).send({
    message: firstMsg,
    details: error.flatten(),
  });
}

export async function registerAuthRoutes(app: FastifyInstance, deps: AppDeps): Promise<void> {
  const users = getUserRepo(deps);

  // POST /api/public/auth/register — Email & Password Registration
  app.post("/api/public/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    const { name, email, password } = parsed.data;

    const existing = await users.findByEmail(email);
    if (existing) {
      return reply.status(409).send({
        message: "Ya existe una cuenta registrada con este correo electrónico.",
      });
    }

    const created = await users.create({
      email,
      name,
      passwordHash: hashPin(password),
    });

    const token = signAuthToken(created, deps.config.cookieSecret);
    return reply.status(201).send({
      token,
      user: toUserDto(created),
    });
  });

  // POST /api/public/auth/login — Email & Password Sign-In
  app.post("/api/public/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    const { email, password } = parsed.data;

    const user = await users.findByEmail(email);
    if (!user || !user.passwordHash || !verifyPin(password, user.passwordHash)) {
      return reply.status(401).send({
        message: "Correo electrónico o contraseña incorrectos.",
      });
    }

    const token = signAuthToken(user, deps.config.cookieSecret);
    return reply.send({
      token,
      user: toUserDto(user),
    });
  });

  // POST /api/public/auth/google — Sign in / Register with Google (Gmail)
  app.post("/api/public/auth/google", async (req, reply) => {
    const parsed = googleAuthSchema.safeParse(req.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);
    const body = parsed.data;

    let email: string;
    let name: string;
    let googleSub: string;
    let avatarUrl: string | null = null;

    if (body.credential) {
      try {
        const info = await verifyGoogleIdToken(body.credential, deps.config.googleClientId);
        email = info.email.trim().toLowerCase();
        name = (info.name ?? email.split("@")[0] ?? "Usuario Gmail").trim();
        googleSub = info.sub;
        avatarUrl = info.picture ?? null;
      } catch (err) {
        return reply.status(401).send({
          message: err instanceof Error ? err.message : "No se pudo verificar la cuenta de Google",
        });
      }
    } else if (body.email) {
      email = body.email.trim().toLowerCase();
      name = (body.name?.trim() || email.split("@")[0] || "Usuario Gmail").trim();
      googleSub = body.googleSub?.trim() || `gmail:${email}`;
      avatarUrl = body.picture ?? null;
    } else {
      return reply.status(400).send({
        message: "Se requiere el token o correo de Google para continuar.",
      });
    }

    let user = (await users.findByGoogleSub(googleSub)) ?? (await users.findByEmail(email));
    if (!user) {
      user = await users.create({
        email,
        name,
        googleSub,
        avatarUrl,
      });
    } else if (!user.googleSub || (!user.avatarUrl && avatarUrl)) {
      user =
        (await users.update(user.id, {
          googleSub: user.googleSub ?? googleSub,
          avatarUrl: user.avatarUrl ?? avatarUrl,
        })) ?? user;
    }

    const token = signAuthToken(user, deps.config.cookieSecret);
    return reply.send({
      token,
      user: toUserDto(user),
    });
  });

  // GET /api/public/auth/me — Current authenticated user profile
  app.get("/api/public/auth/me", async (req, reply) => {
    const authHeader = req.headers.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : undefined;
    const payload = verifyAuthToken(bearer, deps.config.cookieSecret);
    if (!payload) {
      return reply.status(401).send({ message: "Sesión no válida o expirada" });
    }
    const user = await users.findById(payload.sub);
    if (!user) {
      return reply.status(200).send({
        user: {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          avatarUrl: null,
          hasPassword: true,
          hasGoogle: false,
          createdAt: new Date().toISOString(),
        },
      });
    }
    return reply.send({ user: toUserDto(user) });
  });
}
