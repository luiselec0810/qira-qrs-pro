import Redis from "ioredis";
import {
  SLUG_CACHE_TTL_SECONDS,
  slugCacheKey,
  type CachedQrEntry,
  type SlugCache,
} from "../ports/slugCache";

/**
 * Redis-backed SlugCache that degrades gracefully if Redis is unavailable (RNF-01).
 * Logs connection failure once and falls back to DB without failing redirects.
 */
export class RedisSlugCache implements SlugCache {
  private readonly client: Redis;
  private loggedDown = false;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      connectTimeout: 500,
      commandTimeout: 300,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 1000, 10_000),
    });

    this.client.on("error", (err) => {
      if (!this.loggedDown) {
        this.loggedDown = true;
        console.warn(`[RedisSlugCache] Redis unavailable (${err.message}); falling back to database.`);
      }
    });

    this.client.on("ready", () => {
      this.loggedDown = false;
    });
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.client.status === "ready") return true;
    if (this.client.status === "wait" || this.client.status === "close" || this.client.status === "end") {
      try {
        await this.client.connect();
        return true;
      } catch (err) {
        if (!this.loggedDown) {
          this.loggedDown = true;
          console.warn(
            `[RedisSlugCache] Redis connect failed (${(err as Error).message}); falling back to database.`,
          );
        }
        return false;
      }
    }
    return false;
  }

  async get(slug: string): Promise<CachedQrEntry | null> {
    try {
      if (!(await this.ensureConnected())) return null;
      const raw = await this.client.get(slugCacheKey(slug));
      if (!raw) return null;
      return JSON.parse(raw) as CachedQrEntry;
    } catch {
      return null;
    }
  }

  async set(slug: string, entry: CachedQrEntry, ttlSeconds = SLUG_CACHE_TTL_SECONDS): Promise<void> {
    try {
      if (!(await this.ensureConnected())) return;
      await this.client.set(slugCacheKey(slug), JSON.stringify(entry), "EX", ttlSeconds);
    } catch {
      // Best-effort cache write
    }
  }

  async invalidate(slug: string): Promise<void> {
    try {
      if (!(await this.ensureConnected())) return;
      await this.client.del(slugCacheKey(slug));
    } catch {
      // Best-effort cache invalidation
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (!(await this.ensureConnected())) return false;
      const res = await this.client.ping();
      return res === "PONG";
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
