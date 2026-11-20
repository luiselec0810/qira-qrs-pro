import type {
  AnalyticsQuery,
  AnalyticsResponse,
  AnalyticsSeriesPoint,
  ScanEventInput,
} from "../ports/scanSink";

export interface QrMetaForAnalytics {
  id: string;
  name: string;
  slug: string;
}

/**
 * Formats a Date into a bucket string in the given IANA timezone:
 * - granularity === "day"  -> "YYYY-MM-DD"
 * - granularity === "hour" -> "YYYY-MM-DDTHH:00"
 */
export function formatBucket(date: Date, tz: string, granularity: "day" | "hour"): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const y = parts.year ?? "1970";
  const m = parts.month ?? "01";
  const d = parts.day ?? "01";
  if (granularity === "day") {
    return `${y}-${m}-${d}`;
  }
  const h = parts.hour === "24" ? "00" : (parts.hour ?? "00");
  return `${y}-${m}-${d}T${h}:00`;
}

/**
 * Generates zero-filled ordered bucket keys between `from` and `to` (inclusive) in `tz`.
 */
export function buildBucketKeys(from: Date, to: Date, tz: string, granularity: "day" | "hour"): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const stepMs = granularity === "hour" ? 3600_000 : 3600_000 * 6;
  const endMs = to.getTime();
  for (let t = from.getTime(); t <= endMs; t += stepMs) {
    const key = formatBucket(new Date(t), tz, granularity);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  const finalKey = formatBucket(to, tz, granularity);
  if (!seen.has(finalKey)) {
    seen.add(finalKey);
    keys.push(finalKey);
  }
  return keys;
}

export function aggregateScans(
  scans: ScanEventInput[],
  qrsById: Map<string, QrMetaForAnalytics>,
  query: AnalyticsQuery,
): AnalyticsResponse {
  const fromMs = query.from.getTime();
  const toMs = query.to.getTime();

  const filtered = scans.filter((s) => {
    if (!qrsById.has(s.qrId)) return false;
    if (query.qrId && s.qrId !== query.qrId) return false;
    const t = s.scannedAt.getTime();
    return t >= fromMs && t <= toMs;
  });

  const uniqueVisitors = new Set<string>();
  const bucketMap = new Map<string, { scans: number; visitors: Set<string> }>();
  for (const key of buildBucketKeys(query.from, query.to, query.tz, query.granularity)) {
    bucketMap.set(key, { scans: 0, visitors: new Set() });
  }

  const osCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  const cityCounts = new Map<string, { city: string; country: string | null; count: number }>();
  const qrCounts = new Map<string, number>();

  for (const s of filtered) {
    uniqueVisitors.add(s.visitorHash);

    const bKey = formatBucket(s.scannedAt, query.tz, query.granularity);
    let bucket = bucketMap.get(bKey);
    if (!bucket) {
      bucket = { scans: 0, visitors: new Set() };
      bucketMap.set(bKey, bucket);
    }
    bucket.scans += 1;
    bucket.visitors.add(s.visitorHash);

    const os = s.os ?? "Unknown";
    osCounts.set(os, (osCounts.get(os) ?? 0) + 1);

    const dev = s.deviceType ?? "unknown";
    deviceCounts.set(dev, (deviceCounts.get(dev) ?? 0) + 1);

    if (s.city) {
      const cityKey = `${s.city}:::${s.country ?? ""}`;
      const existing = cityCounts.get(cityKey);
      if (existing) existing.count += 1;
      else cityCounts.set(cityKey, { city: s.city, country: s.country, count: 1 });
    }

    qrCounts.set(s.qrId, (qrCounts.get(s.qrId) ?? 0) + 1);
  }

  const series: AnalyticsSeriesPoint[] = [...bucketMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, data]) => ({
      bucket,
      scans: data.scans,
      unique: data.visitors.size,
    }));

  const byOs = [...osCounts.entries()]
    .map(([os, count]) => ({ os, count }))
    .sort((a, b) => b.count - a.count);

  const byDevice = [...deviceCounts.entries()]
    .map(([deviceType, count]) => ({ deviceType, count }))
    .sort((a, b) => b.count - a.count);

  const topCities = [...cityCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topQrs = query.qrId
    ? []
    : [...qrCounts.entries()]
        .map(([qrId, count]) => {
          const meta = qrsById.get(qrId)!;
          return { qrId, name: meta.name, slug: meta.slug, scans: count };
        })
        .sort((a, b) => b.scans - a.scans)
        .slice(0, 10);

  return {
    totals: { scans: filtered.length, unique: uniqueVisitors.size },
    series,
    byOs,
    byDevice,
    topCities,
    topQrs,
  };
}
