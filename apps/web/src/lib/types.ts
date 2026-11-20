import type {
  DestinationType,
  LandingData,
  QrStatus,
  QrStyleConfig,
  RuleType,
  UtmParams,
} from "@qira/shared";

export interface RuleDto {
  id: string;
  ruleType: RuleType;
  conditionData: Record<string, unknown>;
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

export interface CardDto {
  id: string;
  name: string;
  qrId: string | null;
  widthCm: number;
  heightCm: number;
  bleedMm: number;
  isDoubleSided: boolean;
  frontCanvasJson: unknown;
  backCanvasJson: unknown | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsDto {
  totals: { scans: number; unique: number };
  series: Array<{ bucket: string; scans: number; unique: number }>;
  byOs: Array<{ os: string; count: number }>;
  byDevice: Array<{ deviceType: string; count: number }>;
  topCities: Array<{ city: string; country: string | null; count: number }>;
  topQrs: Array<{ qrId: string; name: string; slug: string; scans: number }>;
}

export interface BatchResultDto {
  batchId: string;
  items: Array<QrDto & { row: Record<string, string> }>;
  errors: Array<{ rowIndex: number; message: string }>;
}
