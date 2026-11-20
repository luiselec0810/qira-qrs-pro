import { Prisma, type PrismaClient } from "@qira/db";
import type { DestinationType, LandingData, QrStatus, QrStyleConfig, UtmParams } from "@qira/shared";
import type { CardRecord, CardRepository, CreateCardData, UpdateCardData } from "../ports/cardRepository";
import type {
  CreateQrData,
  ListQrsFilter,
  QrRecord,
  QrRepository,
  UpdateQrData,
} from "../ports/qrRepository";
import type { AnalyticsQuery, AnalyticsResponse, ScanEventInput, ScanSink } from "../ports/scanSink";
import { UniqueSlugError } from "./inMemoryAdapters";
import { aggregateScans } from "./analyticsHelper";

type PrismaQrWithRelations = Prisma.QrCodeGetPayload<{
  include: {
    rules: true;
    _count: { select: { scans: true } };
  };
}>;

function mapPrismaQr(row: PrismaQrWithRelations): QrRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    slug: row.slug,
    destinationType: row.destinationType as DestinationType,
    defaultUrl: row.defaultUrl,
    landingData: (row.landingData as LandingData | null) ?? null,
    fallbackUrl: row.fallbackUrl,
    expiresAt: row.expiresAt,
    pinCode: row.pinCode,
    timezone: row.timezone,
    utmParams: (row.utmParams as UtmParams | null) ?? {},
    webhookUrl: row.webhookUrl,
    styleConfig: (row.styleConfig as unknown as QrStyleConfig) ?? ({} as QrStyleConfig),
    status: row.status as QrStatus,
    batchId: row.batchId,
    rules: row.rules.map((r) => ({
      id: r.id,
      ruleType: r.ruleType as "schedule" | "device" | "language",
      conditionData: (r.conditionData as Record<string, unknown>) ?? {},
      targetUrl: r.targetUrl,
      priority: r.priority,
    })),
    scanCount: row._count.scans,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}

export class PrismaQrRepository implements QrRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(filter: ListQrsFilter): Promise<QrRecord[]> {
    const where: Prisma.QrCodeWhereInput = { userId: filter.userId };
    if (filter.status) where.status = filter.status;
    if (filter.batchId) where.batchId = filter.batchId;
    if (filter.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { defaultUrl: { contains: q, mode: "insensitive" } },
      ];
    }
    const rows = await this.db.qrCode.findMany({
      where,
      include: { rules: { orderBy: { priority: "asc" } }, _count: { select: { scans: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapPrismaQr);
  }

  async findById(userId: string, id: string): Promise<QrRecord | null> {
    const row = await this.db.qrCode.findFirst({
      where: { id, userId },
      include: { rules: { orderBy: { priority: "asc" } }, _count: { select: { scans: true } } },
    });
    return row ? mapPrismaQr(row) : null;
  }

  async findBySlug(slug: string): Promise<QrRecord | null> {
    const row = await this.db.qrCode.findUnique({
      where: { slug },
      include: { rules: { orderBy: { priority: "asc" } }, _count: { select: { scans: true } } },
    });
    return row ? mapPrismaQr(row) : null;
  }

  async create(data: CreateQrData): Promise<QrRecord> {
    try {
      const row = await this.db.qrCode.create({
        data: {
          userId: data.userId,
          name: data.name,
          slug: data.slug,
          destinationType: data.destinationType,
          defaultUrl: data.defaultUrl,
          landingData: data.landingData ? (data.landingData as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          fallbackUrl: data.fallbackUrl,
          expiresAt: data.expiresAt,
          pinCode: data.pinCode,
          timezone: data.timezone,
          utmParams: data.utmParams as unknown as Prisma.InputJsonValue,
          webhookUrl: data.webhookUrl,
          styleConfig: data.styleConfig as unknown as Prisma.InputJsonValue,
          status: data.status,
          batchId: data.batchId,
          rules: {
            create: data.rules.map((r) => ({
              ruleType: r.ruleType,
              conditionData: r.conditionData as unknown as Prisma.InputJsonValue,
              targetUrl: r.targetUrl,
              priority: r.priority,
            })),
          },
        },
        include: { rules: { orderBy: { priority: "asc" } }, _count: { select: { scans: true } } },
      });
      return mapPrismaQr(row);
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new UniqueSlugError(data.slug);
      throw err;
    }
  }

  async createBatch(items: CreateQrData[]): Promise<QrRecord[]> {
    try {
      const rows = await this.db.$transaction(
        items.map((data) =>
          this.db.qrCode.create({
            data: {
              userId: data.userId,
              name: data.name,
              slug: data.slug,
              destinationType: data.destinationType,
              defaultUrl: data.defaultUrl,
              landingData: data.landingData ? (data.landingData as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
              fallbackUrl: data.fallbackUrl,
              expiresAt: data.expiresAt,
              pinCode: data.pinCode,
              timezone: data.timezone,
              utmParams: data.utmParams as unknown as Prisma.InputJsonValue,
              webhookUrl: data.webhookUrl,
              styleConfig: data.styleConfig as unknown as Prisma.InputJsonValue,
              status: data.status,
              batchId: data.batchId,
            },
            include: { rules: { orderBy: { priority: "asc" } }, _count: { select: { scans: true } } },
          }),
        ),
      );
      return rows.map(mapPrismaQr);
    } catch (err) {
      if (isUniqueConstraintError(err)) throw new UniqueSlugError("batch-slug-collision");
      throw err;
    }
  }

  async update(userId: string, id: string, data: UpdateQrData): Promise<QrRecord | null> {
    const existing = await this.db.qrCode.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return null;

    const row = await this.db.$transaction(async (tx) => {
      if (data.rules !== undefined) {
        await tx.qrRoutingRule.deleteMany({ where: { qrId: id } });
      }
      return tx.qrCode.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.destinationType !== undefined ? { destinationType: data.destinationType } : {}),
          ...(data.defaultUrl !== undefined ? { defaultUrl: data.defaultUrl } : {}),
          ...(data.landingData !== undefined
            ? {
                landingData: data.landingData
                  ? (data.landingData as unknown as Prisma.InputJsonValue)
                  : Prisma.DbNull,
              }
            : {}),
          ...(data.fallbackUrl !== undefined ? { fallbackUrl: data.fallbackUrl } : {}),
          ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
          ...(data.pinCode !== undefined ? { pinCode: data.pinCode } : {}),
          ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
          ...(data.utmParams !== undefined
            ? { utmParams: data.utmParams as unknown as Prisma.InputJsonValue }
            : {}),
          ...(data.webhookUrl !== undefined ? { webhookUrl: data.webhookUrl } : {}),
          ...(data.styleConfig !== undefined
            ? { styleConfig: data.styleConfig as unknown as Prisma.InputJsonValue }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.rules !== undefined
            ? {
                rules: {
                  create: data.rules.map((r) => ({
                    ruleType: r.ruleType,
                    conditionData: r.conditionData as unknown as Prisma.InputJsonValue,
                    targetUrl: r.targetUrl,
                    priority: r.priority,
                  })),
                },
              }
            : {}),
        },
        include: { rules: { orderBy: { priority: "asc" } }, _count: { select: { scans: true } } },
      });
    });

    return mapPrismaQr(row);
  }

  async replaceRules(userId: string, id: string, rules: CreateQrData["rules"]): Promise<QrRecord | null> {
    return this.update(userId, id, { rules });
  }

  async delete(userId: string, id: string): Promise<{ slug: string } | null> {
    const existing = await this.db.qrCode.findFirst({ where: { id, userId }, select: { slug: true } });
    if (!existing) return null;
    await this.db.qrCode.delete({ where: { id } });
    return { slug: existing.slug };
  }

  async ping(): Promise<boolean> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

export class PrismaCardRepository implements CardRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(userId: string): Promise<CardRecord[]> {
    return this.db.cardDesign.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findById(userId: string, id: string): Promise<CardRecord | null> {
    return this.db.cardDesign.findFirst({ where: { id, userId } });
  }

  async create(data: CreateCardData): Promise<CardRecord> {
    return this.db.cardDesign.create({
      data: {
        userId: data.userId,
        name: data.name,
        qrId: data.qrId,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        bleedMm: data.bleedMm,
        isDoubleSided: data.isDoubleSided,
        frontCanvasJson: data.frontCanvasJson as Prisma.InputJsonValue,
        backCanvasJson:
          data.backCanvasJson !== null && data.backCanvasJson !== undefined
            ? (data.backCanvasJson as Prisma.InputJsonValue)
            : Prisma.DbNull,
        thumbnailUrl: data.thumbnailUrl,
      },
    });
  }

  async update(userId: string, id: string, data: UpdateCardData): Promise<CardRecord | null> {
    const existing = await this.db.cardDesign.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return null;
    return this.db.cardDesign.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.qrId !== undefined ? { qrId: data.qrId } : {}),
        ...(data.widthCm !== undefined ? { widthCm: data.widthCm } : {}),
        ...(data.heightCm !== undefined ? { heightCm: data.heightCm } : {}),
        ...(data.bleedMm !== undefined ? { bleedMm: data.bleedMm } : {}),
        ...(data.isDoubleSided !== undefined ? { isDoubleSided: data.isDoubleSided } : {}),
        ...(data.frontCanvasJson !== undefined
          ? { frontCanvasJson: data.frontCanvasJson as Prisma.InputJsonValue }
          : {}),
        ...(data.backCanvasJson !== undefined
          ? {
              backCanvasJson:
                data.backCanvasJson !== null
                  ? (data.backCanvasJson as Prisma.InputJsonValue)
                  : Prisma.DbNull,
            }
          : {}),
        ...(data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl } : {}),
      },
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = await this.db.cardDesign.findFirst({ where: { id, userId }, select: { id: true } });
    if (!existing) return false;
    await this.db.cardDesign.delete({ where: { id } });
    return true;
  }
}

export class PrismaScanSink implements ScanSink {
  constructor(private readonly db: PrismaClient) {}

  async record(event: ScanEventInput): Promise<void> {
    await this.db.qrScan.create({
      data: {
        qrId: event.qrId,
        scannedAt: event.scannedAt,
        visitorHash: event.visitorHash,
        country: event.country,
        city: event.city,
        os: event.os,
        deviceType: event.deviceType,
        resolvedUrl: event.resolvedUrl,
      },
    });
  }

  async queryAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    const userQrs = await this.db.qrCode.findMany({
      where: { userId: query.userId, ...(query.qrId ? { id: query.qrId } : {}) },
      select: { id: true, name: true, slug: true },
    });
    const qrsById = new Map(userQrs.map((q) => [q.id, q]));
    if (qrsById.size === 0) {
      return aggregateScans([], qrsById, query);
    }

    const scans = await this.db.qrScan.findMany({
      where: {
        qrId: { in: [...qrsById.keys()] },
        scannedAt: { gte: query.from, lte: query.to },
      },
      select: {
        qrId: true,
        scannedAt: true,
        visitorHash: true,
        country: true,
        city: true,
        os: true,
        deviceType: true,
        resolvedUrl: true,
      },
    });

    return aggregateScans(scans, qrsById, query);
  }
}
