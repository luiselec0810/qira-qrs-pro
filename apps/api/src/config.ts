import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export interface AppConfig {
  port: number;
  baseUrl: string;
  apiUrl: string;
  cookieSecret: string;
  apiKeys: Map<string, string>;
  redisUrl: string;
  storageDriver: "local" | "s3";
  uploadsDir: string;
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicUrl: string;
  };
}

export function parseApiKeys(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const userId = trimmed.slice(idx + 1).trim();
    if (key && userId) map.set(key, userId);
  }
  return map;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const apiUrl = (process.env.API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
  return {
    port: Number(process.env.API_PORT ?? 4000),
    baseUrl,
    apiUrl,
    cookieSecret: process.env.COOKIE_SECRET ?? "change-me-to-a-long-random-string",
    apiKeys: parseApiKeys(process.env.API_KEYS ?? "dev-key-change-me:demo-user"),
    redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
    storageDriver: process.env.STORAGE_DRIVER === "s3" ? "s3" : "local",
    uploadsDir: path.resolve(__dirname, "../uploads"),
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? "",
      region: process.env.S3_REGION ?? "auto",
      bucket: process.env.S3_BUCKET ?? "",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      publicUrl: (process.env.S3_PUBLIC_URL ?? "").replace(/\/+$/, ""),
    },
    ...overrides,
  };
}
