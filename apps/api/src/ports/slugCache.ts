import type { QrSnapshot } from "@qira/shared";

export const SLUG_CACHE_TTL_SECONDS = 3600;

export function slugCacheKey(slug: string): string {
  return `qr:slug:${slug}`;
}

export interface CachedQrEntry {
  snapshot: QrSnapshot;
  name: string;
  pinCode: string | null;
}

export interface SlugCache {
  get(slug: string): Promise<CachedQrEntry | null>;
  set(slug: string, entry: CachedQrEntry, ttlSeconds?: number): Promise<void>;
  invalidate(slug: string): Promise<void>;
  ping(): Promise<boolean>;
}
