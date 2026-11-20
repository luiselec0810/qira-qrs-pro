import crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  applyTemplate,
  cardDesignSchema,
  createBatchSchema,
  createQrSchema,
  generateSlug,
  normalizeQrStyle,
  routingRuleInputSchema,
  sanitizeUrl,
  updateQrSchema,
  type QrStatus,
} from "@qira/shared";
import type { AppDeps } from "../app";
import { InvalidAssetError, validateAssetBuffer } from "../assetValidation";
import { UniqueSlugError } from "../adapters/inMemoryAdapters";
import { toCardDto } from "../ports/cardRepository";
import { toQrDto, type CreateQrData, type QrDto, type QrRecord } from "../ports/qrRepository";
import { computeVisitorHash, hashPin, resolveApiKey } from "../security";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

const MAX_SLUG_RETRIES = 8;

async function createQrWithRetry(deps: AppDeps, buildData: (slug: string) => CreateQrData): Promise<QrRecord> {
  for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
    const slug = generateSlug(7);
    try {
      return await deps.qrRepo.create(buildData(slug));
    } catch (err) {
      if (err instanceof UniqueSlugError && attempt < MAX_SLUG_RETRIES - 1) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unable to generate unique slug after maximum retries");
}

function sendZodError(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    message: "Validation failed",
    details: error.flatten(),
  });
}

const putRulesBodySchema = z.object({
  rules: z.array(routingRuleInputSchema).max(50),
});

const updateCardSchema = cardDesignSchema.partial();

const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  qrId: z.string().uuid().optional(),
  granularity: z.enum(["day", "hour"]).default("day"),
  tz: z
    .string()
    .default("America/Bogota")
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Invalid IANA timezone"),
});

export async function registerApiV1Routes(app: FastifyInstance, deps: AppDeps): Promise<void> {
  app.register(
    async (v1) => {
      v1.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
        const rawKey = req.headers["x-api-key"];
        const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
        const userId = resolveApiKey(key, deps.config.apiKeys);
        if (!userId) {
          return reply.status(401).send({ message: "Invalid or missing x-api-key" });
        }
        req.userId = userId;
      });

      // -----------------------------------------------------------------------
      // QR Codes (RF-01, RF-02, RF-06.2)
      // -----------------------------------------------------------------------
      v1.get<{
        Querystring: { search?: string; status?: string; batchId?: string };
      }>("/qrs", async (req) => {
        const status =
          req.query.status === "active" || req.query.status === "paused"
            ? (req.query.status as QrStatus)
            : undefined;
        const records = await deps.qrRepo.list({
          userId: req.userId,
          search: req.query.search,
          status,
          batchId: req.query.batchId,
        });
        return {
          items: records.map((r) => toQrDto(r, deps.config.baseUrl)),
        };
      });

      v1.post("/qrs", async (req, reply) => {
        const parsed = createQrSchema.safeParse(req.body);
        if (!parsed.success) return sendZodError(reply, parsed.error);
        const input = parsed.data;

        const record = await createQrWithRetry(deps, (slug) => ({
          userId: req.userId,
          name: input.name,
          slug,
          destinationType: input.destinationType,
          defaultUrl: input.defaultUrl ?? null,
          landingData: input.landingData ?? null,
          fallbackUrl: input.fallbackUrl ?? null,
          expiresAt: input.expiresAt ?? null,
          pinCode: input.pinCode ? hashPin(input.pinCode) : null,
          timezone: input.timezone,
          utmParams: input.utmParams ?? {},
          webhookUrl: input.webhookUrl ?? null,
          styleConfig: normalizeQrStyle(input.styleConfig as never),
          status: input.status,
          batchId: null,
          rules: input.rules ?? [],
        }));

        await deps.slugCache.invalidate(record.slug);
        return reply.status(201).send(toQrDto(record, deps.config.baseUrl));
      });

      v1.get<{ Params: { id: string } }>("/qrs/:id", async (req, reply) => {
        const record = await deps.qrRepo.findById(req.userId, req.params.id);
        if (!record) return reply.status(404).send({ message: "QR code not found" });
        return toQrDto(record, deps.config.baseUrl);
      });

      v1.patch<{ Params: { id: string } }>("/qrs/:id", async (req, reply) => {
        const parsed = updateQrSchema.safeParse(req.body);
        if (!parsed.success) return sendZodError(reply, parsed.error);
        const input = parsed.data;

        const existing = await deps.qrRepo.findById(req.userId, req.params.id);
        if (!existing) return reply.status(404).send({ message: "QR code not found" });

        const effectiveDest = input.destinationType ?? existing.destinationType;
        const effectiveDefaultUrl = input.defaultUrl !== undefined ? input.defaultUrl : existing.defaultUrl;
        const effectiveLandingData = input.landingData !== undefined ? input.landingData : existing.landingData;

        if (effectiveDest === "url" && !effectiveDefaultUrl) {
          return reply.status(400).send({
            message: "Validation failed",
            details: { formErrors: [], fieldErrors: { defaultUrl: ["defaultUrl is required for url destinations"] } },
          });
        }
        if (
          (effectiveDest === "vcard" || effectiveDest === "hub") &&
          (!effectiveLandingData || effectiveLandingData.kind !== effectiveDest)
        ) {
          return reply.status(400).send({
            message: "Validation failed",
            details: {
              formErrors: [],
              fieldErrors: { landingData: [`landingData.kind must be "${effectiveDest}"`] },
            },
          });
        }

        const updated = await deps.qrRepo.update(req.userId, req.params.id, {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.destinationType !== undefined ? { destinationType: input.destinationType } : {}),
          ...(input.defaultUrl !== undefined ? { defaultUrl: input.defaultUrl } : {}),
          ...(input.landingData !== undefined ? { landingData: input.landingData } : {}),
          ...(input.fallbackUrl !== undefined ? { fallbackUrl: input.fallbackUrl } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
          ...(input.pinCode !== undefined
            ? { pinCode: input.pinCode === null ? null : hashPin(input.pinCode) }
            : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.utmParams !== undefined ? { utmParams: input.utmParams } : {}),
          ...(input.webhookUrl !== undefined ? { webhookUrl: input.webhookUrl } : {}),
          ...(input.styleConfig !== undefined
            ? { styleConfig: normalizeQrStyle(input.styleConfig as never) }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.rules !== undefined ? { rules: input.rules } : {}),
        });

        if (!updated) return reply.status(404).send({ message: "QR code not found" });
        await deps.slugCache.invalidate(updated.slug);
        return toQrDto(updated, deps.config.baseUrl);
      });

      v1.delete<{ Params: { id: string } }>("/qrs/:id", async (req, reply) => {
        const deleted = await deps.qrRepo.delete(req.userId, req.params.id);
        if (!deleted) return reply.status(404).send({ message: "QR code not found" });
        await deps.slugCache.invalidate(deleted.slug);
        return reply.status(204).send();
      });

      v1.put<{ Params: { id: string } }>("/qrs/:id/rules", async (req, reply) => {
        const parsed = putRulesBodySchema.safeParse(req.body);
        if (!parsed.success) return sendZodError(reply, parsed.error);

        const updated = await deps.qrRepo.replaceRules(req.userId, req.params.id, parsed.data.rules);
        if (!updated) return reply.status(404).send({ message: "QR code not found" });
        await deps.slugCache.invalidate(updated.slug);
        return toQrDto(updated, deps.config.baseUrl);
      });

      v1.post<{ Params: { id: string } }>("/qrs/:id/webhook-test", async (req, reply) => {
        const record = await deps.qrRepo.findById(req.userId, req.params.id);
        if (!record) return reply.status(404).send({ message: "QR code not found" });
        if (!record.webhookUrl) {
          return reply.status(400).send({ message: "QR code has no webhookUrl configured" });
        }

        const now = deps.clock ? deps.clock() : new Date();
        const visitorHash = computeVisitorHash(now, deps.config.cookieSecret, req.ip || "127.0.0.1", "WebhookTest/1.0");
        const result = await deps.webhookDispatcher.dispatch(record.webhookUrl, {
          event: "qr.scanned",
          qr: {
            id: record.id,
            slug: record.slug,
            name: record.name,
          },
          scan: {
            scannedAt: now.toISOString(),
            resolvedUrl: record.defaultUrl ?? `${deps.config.baseUrl}/p/${record.slug}`,
            reason: record.destinationType === "url" ? "default" : "landing",
            os: "Desktop",
            deviceType: "desktop",
            language: "en",
            country: null,
            city: null,
            visitorHash,
            userAgent: "QiraQRsPro-WebhookTest/1.0",
            referer: null,
          },
        });
        return result;
      });

      // -----------------------------------------------------------------------
      // Batches (RF-04.2)
      // -----------------------------------------------------------------------
      v1.post("/batches", async (req, reply) => {
        const parsed = createBatchSchema.safeParse(req.body);
        if (!parsed.success) return sendZodError(reply, parsed.error);
        const input = parsed.data;

        const batchId = crypto.randomUUID();
        const styleConfig = normalizeQrStyle(input.styleConfig as never);
        const validEntries: Array<{ row: Record<string, string>; data: CreateQrData }> = [];
        const errors: Array<{ rowIndex: number; message: string }> = [];
        const usedSlugs = new Set<string>();

        const nextUniqueSlug = (): string => {
          for (;;) {
            const candidate = generateSlug(7);
            if (!usedSlugs.has(candidate)) {
              usedSlugs.add(candidate);
              return candidate;
            }
          }
        };

        for (let i = 0; i < input.rows.length; i++) {
          const row = input.rows[i]!;
          const trimmedTemplate = input.defaultUrlTemplate.trim();
          const isWholeVar = /^\{\{\s*[a-zA-Z0-9_\-.]+\s*\}\}$/.test(trimmedTemplate);
          const rawUrl = applyTemplate(input.defaultUrlTemplate, row, { encode: !isWholeVar });
          let sanitizedUrl: string;
          try {
            sanitizedUrl = sanitizeUrl(rawUrl);
          } catch (err) {
            errors.push({ rowIndex: i, message: (err as Error).message });
            continue;
          }

          const customName = row.name?.trim();
          const name = customName ? customName : `${input.namePrefix} ${i + 1}`;

          validEntries.push({
            row,
            data: {
              userId: req.userId,
              name,
              slug: nextUniqueSlug(),
              destinationType: "url",
              defaultUrl: sanitizedUrl,
              landingData: null,
              fallbackUrl: null,
              expiresAt: null,
              pinCode: null,
              timezone: input.timezone,
              utmParams: input.utmParams ?? {},
              webhookUrl: input.webhookUrl ?? null,
              styleConfig,
              status: "active",
              batchId,
              rules: [],
            },
          });
        }

        let createdRecords: QrRecord[] = [];
        if (validEntries.length > 0) {
          for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
            try {
              createdRecords = await deps.qrRepo.createBatch(validEntries.map((e) => e.data));
              break;
            } catch (err) {
              if (err instanceof UniqueSlugError && attempt < MAX_SLUG_RETRIES - 1) {
                usedSlugs.clear();
                for (const entry of validEntries) {
                  entry.data.slug = nextUniqueSlug();
                }
                continue;
              }
              throw err;
            }
          }
        }

        await Promise.all(createdRecords.map((r) => deps.slugCache.invalidate(r.slug)));

        const items: Array<QrDto & { row: Record<string, string> }> = createdRecords.map((rec, idx) => ({
          ...toQrDto(rec, deps.config.baseUrl),
          row: validEntries[idx]!.row,
        }));

        return reply.status(201).send({ batchId, items, errors });
      });

      // -----------------------------------------------------------------------
      // Card Designs (RF-03)
      // -----------------------------------------------------------------------
      v1.get("/cards", async (req) => {
        const records = await deps.cardRepo.list(req.userId);
        return { items: records.map(toCardDto) };
      });

      v1.post("/cards", async (req, reply) => {
        const parsed = cardDesignSchema.safeParse(req.body);
        if (!parsed.success) return sendZodError(reply, parsed.error);
        const input = parsed.data;

        if (input.qrId) {
          const qr = await deps.qrRepo.findById(req.userId, input.qrId);
          if (!qr) return reply.status(404).send({ message: "Linked QR code not found" });
        }

        const created = await deps.cardRepo.create({
          userId: req.userId,
          name: input.name,
          qrId: input.qrId ?? null,
          widthCm: input.widthCm,
          heightCm: input.heightCm,
          bleedMm: input.bleedMm,
          isDoubleSided: input.isDoubleSided,
          frontCanvasJson: input.frontCanvasJson,
          backCanvasJson: input.backCanvasJson ?? null,
          thumbnailUrl: input.thumbnailUrl ?? null,
        });

        return reply.status(201).send(toCardDto(created));
      });

      v1.get<{ Params: { id: string } }>("/cards/:id", async (req, reply) => {
        const record = await deps.cardRepo.findById(req.userId, req.params.id);
        if (!record) return reply.status(404).send({ message: "Card design not found" });
        return toCardDto(record);
      });

      v1.patch<{ Params: { id: string } }>("/cards/:id", async (req, reply) => {
        const parsed = updateCardSchema.safeParse(req.body);
        if (!parsed.success) return sendZodError(reply, parsed.error);
        const input = parsed.data;

        if (input.qrId) {
          const qr = await deps.qrRepo.findById(req.userId, input.qrId);
          if (!qr) return reply.status(404).send({ message: "Linked QR code not found" });
        }

        const updated = await deps.cardRepo.update(req.userId, req.params.id, {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.qrId !== undefined ? { qrId: input.qrId } : {}),
          ...(input.widthCm !== undefined ? { widthCm: input.widthCm } : {}),
          ...(input.heightCm !== undefined ? { heightCm: input.heightCm } : {}),
          ...(input.bleedMm !== undefined ? { bleedMm: input.bleedMm } : {}),
          ...(input.isDoubleSided !== undefined ? { isDoubleSided: input.isDoubleSided } : {}),
          ...(input.frontCanvasJson !== undefined ? { frontCanvasJson: input.frontCanvasJson } : {}),
          ...(input.backCanvasJson !== undefined ? { backCanvasJson: input.backCanvasJson } : {}),
          ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
        });

        if (!updated) return reply.status(404).send({ message: "Card design not found" });
        return toCardDto(updated);
      });

      v1.delete<{ Params: { id: string } }>("/cards/:id", async (req, reply) => {
        const ok = await deps.cardRepo.delete(req.userId, req.params.id);
        if (!ok) return reply.status(404).send({ message: "Card design not found" });
        return reply.status(204).send();
      });

      // -----------------------------------------------------------------------
      // Assets (RNF-03)
      // -----------------------------------------------------------------------
      v1.post("/assets", async (req, reply) => {
        const file = await req.file();
        if (!file) {
          return reply.status(400).send({ message: "Missing multipart file field" });
        }

        const buffer = await file.toBuffer();
        if (file.file.truncated) {
          return reply.status(413).send({ message: "File exceeds 10 MB limit" });
        }

        try {
          const validated = validateAssetBuffer(buffer);
          const stored = await deps.assetStorage.save({
            buffer,
            mime: validated.mime,
            ext: validated.ext,
          });
          return reply
            .status(201)
            .header("Access-Control-Allow-Origin", "*")
            .send(stored);
        } catch (err) {
          if (err instanceof InvalidAssetError) {
            return reply.status(err.statusCode).send({ message: err.message });
          }
          throw err;
        }
      });

      // -----------------------------------------------------------------------
      // Analytics (RF-06.1)
      // -----------------------------------------------------------------------
      v1.get("/analytics", async (req, reply) => {
        const parsed = analyticsQuerySchema.safeParse(req.query);
        if (!parsed.success) return sendZodError(reply, parsed.error);
        const q = parsed.data;

        const now = deps.clock ? deps.clock() : new Date();
        const to = q.to ? new Date(q.to) : now;
        const from = q.from ? new Date(q.from) : new Date(to.getTime() - 29 * 24 * 3600_000);

        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from.getTime() > to.getTime()) {
          return reply.status(400).send({ message: "Invalid 'from' or 'to' date range" });
        }

        const report = await deps.scanSink.queryAnalytics({
          userId: req.userId,
          from,
          to,
          qrId: q.qrId,
          granularity: q.granularity,
          tz: q.tz,
        });

        return report;
      });
    },
    { prefix: "/api/v1" },
  );
}
