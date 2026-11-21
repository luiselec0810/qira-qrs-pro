import fs from "node:fs";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import type { AppConfig } from "./config";
import type { AssetStorage } from "./ports/assetStorage";
import type { CardRepository } from "./ports/cardRepository";
import type { QrRepository } from "./ports/qrRepository";
import type { ScanSink } from "./ports/scanSink";
import type { SlugCache } from "./ports/slugCache";
import type { UserRepository } from "./ports/userRepository";
import type { WebhookDispatcher } from "./ports/webhookDispatcher";
import { registerApiV1Routes } from "./http/apiV1Routes";
import { registerAuthRoutes } from "./http/authRoutes";
import { registerPublicRoutes } from "./http/publicRoutes";

export interface AppDeps {
  config: AppConfig;
  qrRepo: QrRepository;
  cardRepo: CardRepository;
  userRepo?: UserRepository;
  slugCache: SlugCache;
  scanSink: ScanSink;
  webhookDispatcher: WebhookDispatcher;
  assetStorage: AssetStorage;
  clock?: () => Date;
  logger?: boolean;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: true,
    logger: deps.logger ?? false,
  });

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  await app.register(fastifyCookie, {
    secret: deps.config.cookieSecret,
  });

  await app.register(fastifyFormbody);

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 1,
    },
  });

  await app.register(fastifyRateLimit, {
    global: false,
  });

  if (deps.config.storageDriver === "local") {
    fs.mkdirSync(deps.config.uploadsDir, { recursive: true });
    await app.register(fastifyStatic, {
      root: deps.config.uploadsDir,
      prefix: "/uploads/",
      setHeaders: (res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      },
    });
  }

  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, req, reply) => {
    if (err.code === "FST_REQ_FILE_TOO_LARGE") {
      return reply.status(413).send({ message: "File exceeds 10 MB limit" });
    }
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500) {
      req.log.error({ err }, "Unhandled error");
    }
    return reply.status(status).send({
      message: status === 500 ? "Internal server error" : err.message,
    });
  });

  await registerPublicRoutes(app, deps);
  await registerAuthRoutes(app, deps);
  await registerApiV1Routes(app, deps);

  return app;
}
