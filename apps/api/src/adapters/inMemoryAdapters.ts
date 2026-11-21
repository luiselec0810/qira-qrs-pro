import crypto from "node:crypto";
import type { CardRecord, CardRepository, CreateCardData, UpdateCardData } from "../ports/cardRepository";
import type {
  CreateQrData,
  ListQrsFilter,
  QrRecord,
  QrRepository,
  UpdateQrData,
} from "../ports/qrRepository";
import type { AnalyticsQuery, AnalyticsResponse, ScanEventInput, ScanSink } from "../ports/scanSink";
import type { CachedQrEntry, SlugCache } from "../ports/slugCache";
import type { WebhookDispatcher, WebhookDispatchResult, WebhookPayload } from "../ports/webhookDispatcher";
import type { AssetStorage, StoredAsset } from "../ports/assetStorage";
import type { CreateUserData, UserRecord, UserRepository } from "../ports/userRepository";
import type { SupportedImageMime } from "../assetValidation";
import { aggregateScans } from "./analyticsHelper";

export class UniqueSlugError extends Error {
  constructor(slug: string) {
    super(`Slug "${slug}" already exists`);
    this.name = "UniqueSlugError";
  }
}

export class InMemoryQrRepository implements QrRepository {
  public readonly items = new Map<string, QrRecord>();
  public readonly scans: ScanEventInput[] = [];

  async list(filter: ListQrsFilter): Promise<QrRecord[]> {
    const search = filter.search?.trim().toLowerCase();
    return [...this.items.values()]
      .filter((q) => {
        if (q.userId !== filter.userId) return false;
        if (filter.status && q.status !== filter.status) return false;
        if (filter.batchId && q.batchId !== filter.batchId) return false;
        if (search) {
          const hit =
            q.name.toLowerCase().includes(search) ||
            q.slug.toLowerCase().includes(search) ||
            (q.defaultUrl?.toLowerCase().includes(search) ?? false);
          if (!hit) return false;
        }
        return true;
      })
      .map((q) => ({ ...q, scanCount: this.countScans(q.id) }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findById(userId: string, id: string): Promise<QrRecord | null> {
    const found = this.items.get(id);
    if (!found || found.userId !== userId) return null;
    return { ...found, scanCount: this.countScans(found.id) };
  }

  async findBySlug(slug: string): Promise<QrRecord | null> {
    for (const item of this.items.values()) {
      if (item.slug === slug) {
        return { ...item, scanCount: this.countScans(item.id) };
      }
    }
    return null;
  }

  async create(data: CreateQrData): Promise<QrRecord> {
    for (const existing of this.items.values()) {
      if (existing.slug === data.slug) throw new UniqueSlugError(data.slug);
    }
    const now = new Date();
    const record: QrRecord = {
      id: crypto.randomUUID(),
      userId: data.userId,
      name: data.name,
      slug: data.slug,
      destinationType: data.destinationType,
      defaultUrl: data.defaultUrl,
      landingData: data.landingData,
      fallbackUrl: data.fallbackUrl,
      expiresAt: data.expiresAt,
      pinCode: data.pinCode,
      timezone: data.timezone,
      utmParams: data.utmParams,
      webhookUrl: data.webhookUrl,
      styleConfig: data.styleConfig,
      status: data.status,
      batchId: data.batchId,
      rules: data.rules.map((r) => ({
        id: crypto.randomUUID(),
        ruleType: r.ruleType,
        conditionData: r.conditionData as unknown as Record<string, unknown>,
        targetUrl: r.targetUrl,
        priority: r.priority,
      })),
      scanCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(record.id, record);
    return { ...record };
  }

  async createBatch(items: CreateQrData[]): Promise<QrRecord[]> {
    const slugs = new Set<string>();
    for (const item of items) {
      if (slugs.has(item.slug)) throw new UniqueSlugError(item.slug);
      slugs.add(item.slug);
      for (const existing of this.items.values()) {
        if (existing.slug === item.slug) throw new UniqueSlugError(item.slug);
      }
    }
    const created: QrRecord[] = [];
    for (const item of items) {
      created.push(await this.create(item));
    }
    return created;
  }

  async update(userId: string, id: string, data: UpdateQrData): Promise<QrRecord | null> {
    const existing = this.items.get(id);
    if (!existing || existing.userId !== userId) return null;

    const updated: QrRecord = {
      ...existing,
      name: data.name !== undefined ? data.name : existing.name,
      destinationType: data.destinationType !== undefined ? data.destinationType : existing.destinationType,
      defaultUrl: data.defaultUrl !== undefined ? data.defaultUrl : existing.defaultUrl,
      landingData: data.landingData !== undefined ? data.landingData : existing.landingData,
      fallbackUrl: data.fallbackUrl !== undefined ? data.fallbackUrl : existing.fallbackUrl,
      expiresAt: data.expiresAt !== undefined ? data.expiresAt : existing.expiresAt,
      pinCode: data.pinCode !== undefined ? data.pinCode : existing.pinCode,
      timezone: data.timezone !== undefined ? data.timezone : existing.timezone,
      utmParams: data.utmParams !== undefined ? data.utmParams : existing.utmParams,
      webhookUrl: data.webhookUrl !== undefined ? data.webhookUrl : existing.webhookUrl,
      styleConfig: data.styleConfig !== undefined ? data.styleConfig : existing.styleConfig,
      status: data.status !== undefined ? data.status : existing.status,
      rules:
        data.rules !== undefined
          ? data.rules.map((r) => ({
              id: crypto.randomUUID(),
              ruleType: r.ruleType,
              conditionData: r.conditionData as unknown as Record<string, unknown>,
              targetUrl: r.targetUrl,
              priority: r.priority,
            }))
          : existing.rules,
      updatedAt: new Date(),
    };
    this.items.set(id, updated);
    return { ...updated, scanCount: this.countScans(id) };
  }

  async replaceRules(userId: string, id: string, rules: CreateQrData["rules"]): Promise<QrRecord | null> {
    return this.update(userId, id, { rules });
  }

  async delete(userId: string, id: string): Promise<{ slug: string } | null> {
    const existing = this.items.get(id);
    if (!existing || existing.userId !== userId) return null;
    this.items.delete(id);
    return { slug: existing.slug };
  }

  async ping(): Promise<boolean> {
    return true;
  }

  private countScans(qrId: string): number {
    return this.scans.filter((s) => s.qrId === qrId).length;
  }
}

export class InMemoryCardRepository implements CardRepository {
  private readonly items = new Map<string, CardRecord>();

  async list(userId: string): Promise<CardRecord[]> {
    return [...this.items.values()]
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async findById(userId: string, id: string): Promise<CardRecord | null> {
    const c = this.items.get(id);
    if (!c || c.userId !== userId) return null;
    return { ...c };
  }

  async create(data: CreateCardData): Promise<CardRecord> {
    const now = new Date();
    const record: CardRecord = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(record.id, record);
    return { ...record };
  }

  async update(userId: string, id: string, data: UpdateCardData): Promise<CardRecord | null> {
    const existing = this.items.get(id);
    if (!existing || existing.userId !== userId) return null;
    const updated: CardRecord = {
      ...existing,
      name: data.name !== undefined ? data.name : existing.name,
      qrId: data.qrId !== undefined ? data.qrId : existing.qrId,
      widthCm: data.widthCm !== undefined ? data.widthCm : existing.widthCm,
      heightCm: data.heightCm !== undefined ? data.heightCm : existing.heightCm,
      bleedMm: data.bleedMm !== undefined ? data.bleedMm : existing.bleedMm,
      isDoubleSided: data.isDoubleSided !== undefined ? data.isDoubleSided : existing.isDoubleSided,
      frontCanvasJson: data.frontCanvasJson !== undefined ? data.frontCanvasJson : existing.frontCanvasJson,
      backCanvasJson: data.backCanvasJson !== undefined ? data.backCanvasJson : existing.backCanvasJson,
      thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl : existing.thumbnailUrl,
      updatedAt: new Date(),
    };
    this.items.set(id, updated);
    return { ...updated };
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const existing = this.items.get(id);
    if (!existing || existing.userId !== userId) return false;
    this.items.delete(id);
    return true;
  }
}

export class InMemorySlugCache implements SlugCache {
  public readonly store = new Map<string, CachedQrEntry>();

  async get(slug: string): Promise<CachedQrEntry | null> {
    return this.store.get(slug) ?? null;
  }

  async set(slug: string, entry: CachedQrEntry): Promise<void> {
    this.store.set(slug, entry);
  }

  async invalidate(slug: string): Promise<void> {
    this.store.delete(slug);
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

export class InMemoryScanSink implements ScanSink {
  constructor(private readonly qrRepo: InMemoryQrRepository) {}

  async record(event: ScanEventInput): Promise<void> {
    this.qrRepo.scans.push(event);
  }

  async queryAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    const qrsById = new Map<string, { id: string; name: string; slug: string }>();
    for (const qr of this.qrRepo.items.values()) {
      if (qr.userId === query.userId) {
        qrsById.set(qr.id, { id: qr.id, name: qr.name, slug: qr.slug });
      }
    }
    return aggregateScans(this.qrRepo.scans, qrsById, query);
  }
}

export class InMemoryWebhookDispatcher implements WebhookDispatcher {
  public readonly dispatched: Array<{ url: string; payload: WebhookPayload }> = [];
  public nextResult: WebhookDispatchResult = { ok: true, status: 200 };

  async dispatch(url: string, payload: WebhookPayload): Promise<WebhookDispatchResult> {
    this.dispatched.push({ url, payload });
    return this.nextResult;
  }
}

export class InMemoryAssetStorage implements AssetStorage {
  public readonly files = new Map<string, { buffer: Buffer; mime: SupportedImageMime }>();

  constructor(private readonly baseUrl = "http://localhost:3000") {}

  async save(params: { buffer: Buffer; mime: SupportedImageMime; ext: string }): Promise<StoredAsset> {
    const fileName = `${crypto.randomUUID()}.${params.ext}`;
    this.files.set(fileName, { buffer: params.buffer, mime: params.mime });
    return {
      url: `${this.baseUrl.replace(/\/+$/, "")}/uploads/${fileName}`,
      mime: params.mime,
      size: params.buffer.length,
    };
  }
}

export class InMemoryUserRepository implements UserRepository {
  public readonly users = new Map<string, UserRecord>();

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const lower = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === lower) return u;
    }
    return null;
  }

  async findByGoogleSub(googleSub: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.googleSub === googleSub) return u;
    }
    return null;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      id: data.id ?? crypto.randomUUID(),
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      passwordHash: data.passwordHash ?? null,
      googleSub: data.googleSub ?? null,
      avatarUrl: data.avatarUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(record.id, record);
    return record;
  }

  async update(
    id: string,
    patch: Partial<Pick<UserRecord, "name" | "passwordHash" | "googleSub" | "avatarUrl">>,
  ): Promise<UserRecord | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated: UserRecord = {
      ...existing,
      ...patch,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }
}
