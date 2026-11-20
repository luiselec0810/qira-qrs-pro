import {
  buildLandingUrl,
  buildShortUrl,
  normalizeQrStyle,
  type DestinationType,
  type LandingData,
  type QrSnapshot,
  type QrStatus,
  type QrStyleConfig,
  type RoutingRule,
  type RoutingRuleInput,
  type UtmParams,
} from "@qira/shared";

export interface RuleRecord {
  id: string;
  ruleType: "schedule" | "device" | "language";
  conditionData: Record<string, unknown>;
  targetUrl: string;
  priority: number;
}

export interface QrRecord {
  id: string;
  userId: string;
  name: string;
  slug: string;
  destinationType: DestinationType;
  defaultUrl: string | null;
  landingData: LandingData | null;
  fallbackUrl: string | null;
  expiresAt: Date | null;
  pinCode: string | null;
  timezone: string;
  utmParams: UtmParams;
  webhookUrl: string | null;
  styleConfig: QrStyleConfig;
  status: QrStatus;
  batchId: string | null;
  rules: RuleRecord[];
  scanCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleDto {
  id: string;
  ruleType: "schedule" | "device" | "language";
  conditionData: object;
  targetUrl: string;
  priority: number;
}

export interface QrDto {
  id: string;
  name: string;
  slug: string;
  shortUrl: string;
  landingUrl: string | null;
  destinationType: DestinationType;
  defaultUrl: string | null;
  landingData: LandingData | null;
  fallbackUrl: string | null;
  expiresAt: string | null;
  hasPin: boolean;
  timezone: string;
  utmParams: UtmParams;
  webhookUrl: string | null;
  styleConfig: QrStyleConfig;
  status: QrStatus;
  batchId: string | null;
  rules: RuleDto[];
  scanCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toQrDto(record: QrRecord, baseUrl: string): QrDto {
  const sortedRules = [...record.rules].sort((a, b) => a.priority - b.priority);
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    shortUrl: buildShortUrl(baseUrl, record.slug),
    landingUrl: record.destinationType !== "url" ? buildLandingUrl(baseUrl, record.slug) : null,
    destinationType: record.destinationType,
    defaultUrl: record.defaultUrl,
    landingData: record.landingData,
    fallbackUrl: record.fallbackUrl,
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    hasPin: record.pinCode !== null && record.pinCode !== "",
    timezone: record.timezone,
    utmParams: record.utmParams ?? {},
    webhookUrl: record.webhookUrl,
    styleConfig: normalizeQrStyle(record.styleConfig),
    status: record.status,
    batchId: record.batchId,
    rules: sortedRules.map((r) => ({
      id: r.id,
      ruleType: r.ruleType,
      conditionData: r.conditionData,
      targetUrl: r.targetUrl,
      priority: r.priority,
    })),
    scanCount: record.scanCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toQrSnapshot(record: QrRecord): QrSnapshot {
  const sortedRules = [...record.rules].sort((a, b) => a.priority - b.priority);
  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    destinationType: record.destinationType,
    defaultUrl: record.defaultUrl,
    fallbackUrl: record.fallbackUrl,
    expiresAt: record.expiresAt ? record.expiresAt.toISOString() : null,
    hasPin: record.pinCode !== null && record.pinCode !== "",
    timezone: record.timezone,
    utmParams: record.utmParams ?? {},
    webhookUrl: record.webhookUrl,
    rules: sortedRules.map((r) => ({
      ruleType: r.ruleType,
      conditionData: r.conditionData as never,
      targetUrl: r.targetUrl,
      priority: r.priority,
    })) as RoutingRule[],
  };
}

export interface ListQrsFilter {
  userId: string;
  search?: string;
  status?: QrStatus;
  batchId?: string;
}

export interface CreateQrData {
  userId: string;
  name: string;
  slug: string;
  destinationType: DestinationType;
  defaultUrl: string | null;
  landingData: LandingData | null;
  fallbackUrl: string | null;
  expiresAt: Date | null;
  pinCode: string | null;
  timezone: string;
  utmParams: UtmParams;
  webhookUrl: string | null;
  styleConfig: QrStyleConfig;
  status: QrStatus;
  batchId: string | null;
  rules: RoutingRuleInput[];
}

export interface UpdateQrData {
  name?: string;
  destinationType?: DestinationType;
  defaultUrl?: string | null;
  landingData?: LandingData | null;
  fallbackUrl?: string | null;
  expiresAt?: Date | null;
  pinCode?: string | null;
  timezone?: string;
  utmParams?: UtmParams;
  webhookUrl?: string | null;
  styleConfig?: QrStyleConfig;
  status?: QrStatus;
  rules?: RoutingRuleInput[];
}

export interface QrRepository {
  list(filter: ListQrsFilter): Promise<QrRecord[]>;
  findById(userId: string, id: string): Promise<QrRecord | null>;
  findBySlug(slug: string): Promise<QrRecord | null>;
  create(data: CreateQrData): Promise<QrRecord>;
  createBatch(items: CreateQrData[]): Promise<QrRecord[]>;
  update(userId: string, id: string, data: UpdateQrData): Promise<QrRecord | null>;
  replaceRules(userId: string, id: string, rules: RoutingRuleInput[]): Promise<QrRecord | null>;
  delete(userId: string, id: string): Promise<{ slug: string } | null>;
  ping(): Promise<boolean>;
}
