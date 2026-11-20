import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  buildVCard,
  detectDeviceType,
  detectOs,
  parseAcceptLanguage,
  resolveRedirect,
  vcardFileName,
  type PublicLanding,
} from "@qira/shared";
import type { AppDeps } from "../app";
import { toQrSnapshot } from "../ports/qrRepository";
import type { CachedQrEntry } from "../ports/slugCache";
import { computeVisitorHash, pinCookieToken, verifyPin } from "../security";
import { renderCampaignEndedPage, renderNotFoundPage, renderPinPage } from "./views";

function decodeGeoHeader(raw: string | string[] | undefined): string | null {
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (!val || !val.trim()) return null;
  try {
    return decodeURIComponent(val.trim());
  } catch {
    return val.trim();
  }
}

function extractGeo(req: FastifyRequest): { country: string | null; city: string | null } {
  const country =
    decodeGeoHeader(req.headers["cf-ipcountry"]) ??
    decodeGeoHeader(req.headers["x-vercel-ip-country"]) ??
    null;
  const city =
    decodeGeoHeader(req.headers["cf-ipcity"]) ??
    decodeGeoHeader(req.headers["x-vercel-ip-city"]) ??
    null;
  return { country, city };
}

function pinCookieName(slug: string): string {
  return `qpin_${slug}`;
}

function hasValidPinCookie(req: FastifyRequest, slug: string, pinCode: string | null, secret: string): boolean {
  if (!pinCode) return true;
  const raw = req.cookies[pinCookieName(slug)];
  if (!raw) return false;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return false;
  const expected = pinCookieToken(slug, pinCode, secret);
  return unsigned.value === expected;
}

async function resolveCachedQr(slug: string, deps: AppDeps): Promise<CachedQrEntry | null> {
  const cached = await deps.slugCache.get(slug);
  if (cached) return cached;

  const record = await deps.qrRepo.findBySlug(slug);
  if (!record) return null;

  const entry: CachedQrEntry = {
    snapshot: toQrSnapshot(record),
    name: record.name,
    pinCode: record.pinCode,
  };
  await deps.slugCache.set(slug, entry);
  return entry;
}

export async function registerPublicRoutes(app: FastifyInstance, deps: AppDeps): Promise<void> {
  // Healthcheck
  app.get("/health", async () => {
    const [redis, db] = await Promise.all([deps.slugCache.ping(), deps.qrRepo.ping()]);
    return { ok: true, redis, db };
  });

  // High-speed redirect engine: GET /q/:slug (RF-02, RNF-01)
  app.get<{ Params: { slug: string } }>("/q/:slug", async (req, reply: FastifyReply) => {
    const { slug } = req.params;
    const entry = await resolveCachedQr(slug, deps);
    if (!entry) {
      return reply
        .status(404)
        .header("content-type", "text/html; charset=utf-8")
        .header("cache-control", "no-store")
        .send(renderNotFoundPage(slug));
    }

    const now = deps.clock ? deps.clock() : new Date();
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    const acceptLanguage =
      typeof req.headers["accept-language"] === "string" ? req.headers["accept-language"] : undefined;
    const pinUnlocked = hasValidPinCookie(req, slug, entry.pinCode, deps.config.cookieSecret);

    const decision = resolveRedirect(
      entry.snapshot,
      { now, userAgent, acceptLanguage },
      { baseUrl: deps.config.baseUrl, pinUnlocked },
    );

    if (decision.kind === "ended") {
      return reply
        .status(410)
        .header("content-type", "text/html; charset=utf-8")
        .header("cache-control", "no-store")
        .send(renderCampaignEndedPage(entry.name));
    }

    if (decision.kind === "pin_required") {
      return reply
        .status(200)
        .header("content-type", "text/html; charset=utf-8")
        .header("cache-control", "no-store")
        .send(renderPinPage({ slug, qrName: entry.name }));
    }

    // Send 302 immediately before firing side effects
    reply
      .status(302)
      .header("location", decision.url)
      .header("cache-control", "no-store")
      .send();

    // Fire-and-forget tracking & webhook after the reply
    const ip = req.ip || "0.0.0.0";
    const visitorHash = computeVisitorHash(now, deps.config.cookieSecret, ip, userAgent);
    const os = detectOs(userAgent);
    const deviceType = detectDeviceType(userAgent);
    const { country, city } = extractGeo(req);
    const language = parseAcceptLanguage(acceptLanguage)[0] ?? null;
    const referer = typeof req.headers.referer === "string" ? req.headers.referer : null;

    setImmediate(() => {
      void deps.scanSink
        .record({
          qrId: entry.snapshot.id,
          scannedAt: now,
          visitorHash,
          country,
          city,
          os,
          deviceType,
          resolvedUrl: decision.url,
        })
        .catch((err) => {
          req.log.error({ err, qrId: entry.snapshot.id }, "Failed to record scan");
        });

      if (entry.snapshot.webhookUrl) {
        void deps.webhookDispatcher
          .dispatch(entry.snapshot.webhookUrl, {
            event: "qr.scanned",
            qr: {
              id: entry.snapshot.id,
              slug: entry.snapshot.slug,
              name: entry.name,
            },
            scan: {
              scannedAt: now.toISOString(),
              resolvedUrl: decision.url,
              reason: decision.reason,
              os,
              deviceType,
              language,
              country,
              city,
              visitorHash,
              userAgent: userAgent ?? null,
              referer,
            },
          })
          .catch((err) => {
            req.log.error({ err, qrId: entry.snapshot.id }, "Failed to dispatch webhook");
          });
      }
    });

    return reply;
  });

  // PIN unlock endpoint: POST /q/:slug/unlock (rate limited per IP + slug)
  app.post<{ Params: { slug: string }; Body: { pin?: string } }>(
    "/q/:slug/unlock",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          keyGenerator: (req: FastifyRequest) => `${req.ip}:${(req.params as { slug?: string }).slug ?? ""}`,
        },
      },
    },
    async (req, reply) => {
      const { slug } = req.params;
      const entry = await resolveCachedQr(slug, deps);
      if (!entry) {
        return reply
          .status(404)
          .header("content-type", "text/html; charset=utf-8")
          .header("cache-control", "no-store")
          .send(renderNotFoundPage(slug));
      }

      const pin = typeof req.body?.pin === "string" ? req.body.pin.trim() : "";
      if (!entry.pinCode || !verifyPin(pin, entry.pinCode)) {
        return reply
          .status(401)
          .header("content-type", "text/html; charset=utf-8")
          .header("cache-control", "no-store")
          .send(renderPinPage({ slug, qrName: entry.name, error: "PIN incorrecto. Inténtalo de nuevo." }));
      }

      const token = pinCookieToken(slug, entry.pinCode, deps.config.cookieSecret);
      reply.setCookie(pinCookieName(slug), token, {
        path: `/q/${slug}`,
        httpOnly: true,
        sameSite: "lax",
        signed: true,
        maxAge: 12 * 3600,
      });

      return reply.status(303).header("location", `/q/${slug}`).send();
    },
  );

  // Public hosted landing data: GET /api/public/landings/:slug
  app.get<{ Params: { slug: string } }>("/api/public/landings/:slug", async (req, reply) => {
    const { slug } = req.params;
    const record = await deps.qrRepo.findBySlug(slug);
    const now = deps.clock ? deps.clock() : new Date();
    if (
      !record ||
      record.status !== "active" ||
      (record.expiresAt && now.getTime() > record.expiresAt.getTime()) ||
      (record.destinationType !== "vcard" && record.destinationType !== "hub") ||
      !record.landingData
    ) {
      return reply.status(404).send({ message: "Landing not found" });
    }

    const payload: PublicLanding = {
      slug: record.slug,
      name: record.name,
      destinationType: record.destinationType,
      landingData: record.landingData,
    };
    return reply.send(payload);
  });

  // Public vCard download: GET /api/public/landings/:slug/vcard
  app.get<{ Params: { slug: string } }>("/api/public/landings/:slug/vcard", async (req, reply) => {
    const { slug } = req.params;
    const record = await deps.qrRepo.findBySlug(slug);
    const now = deps.clock ? deps.clock() : new Date();
    if (
      !record ||
      record.status !== "active" ||
      (record.expiresAt && now.getTime() > record.expiresAt.getTime()) ||
      record.destinationType !== "vcard" ||
      !record.landingData ||
      record.landingData.kind !== "vcard"
    ) {
      return reply.status(404).send({ message: "vCard not found" });
    }

    const vcardText = buildVCard(record.landingData.vcard);
    const fileName = vcardFileName(record.landingData.vcard);
    return reply
      .header("content-type", "text/vcard; charset=utf-8")
      .header("content-disposition", `attachment; filename="${fileName}"`)
      .send(vcardText);
  });
}
