export interface ScanEventInput {
  qrId: string;
  scannedAt: Date;
  visitorHash: string;
  country: string | null;
  city: string | null;
  os: string | null;
  deviceType: string | null;
  resolvedUrl: string;
}

export interface AnalyticsQuery {
  userId: string;
  from: Date;
  to: Date;
  qrId?: string;
  granularity: "day" | "hour";
  tz: string;
}

export interface AnalyticsSeriesPoint {
  bucket: string;
  scans: number;
  unique: number;
}

export interface AnalyticsResponse {
  totals: { scans: number; unique: number };
  series: AnalyticsSeriesPoint[];
  byOs: Array<{ os: string; count: number }>;
  byDevice: Array<{ deviceType: string; count: number }>;
  topCities: Array<{ city: string; country: string | null; count: number }>;
  topQrs: Array<{ qrId: string; name: string; slug: string; scans: number }>;
}

export interface ScanSink {
  record(event: ScanEventInput): Promise<void>;
  queryAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse>;
}
