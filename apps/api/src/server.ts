import { prisma } from "@qira/db";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { LocalDiskAssetStorage, S3AssetStorage } from "./adapters/assetStorageAdapters";
import { HttpWebhookDispatcher } from "./adapters/httpWebhookDispatcher";
import { PrismaCardRepository, PrismaQrRepository, PrismaScanSink } from "./adapters/prismaAdapters";
import { RedisSlugCache } from "./adapters/redisSlugCache";

async function main() {
  const config = loadConfig();

  const qrRepo = new PrismaQrRepository(prisma);
  const cardRepo = new PrismaCardRepository(prisma);
  const scanSink = new PrismaScanSink(prisma);
  const slugCache = new RedisSlugCache(config.redisUrl);
  const webhookDispatcher = new HttpWebhookDispatcher(5000);
  const assetStorage =
    config.storageDriver === "s3"
      ? new S3AssetStorage(config.s3)
      : new LocalDiskAssetStorage(config.uploadsDir, config.baseUrl);

  const app = await buildApp({
    config,
    qrRepo,
    cardRepo,
    slugCache,
    scanSink,
    webhookDispatcher,
    assetStorage,
    logger: true,
  });

  const shutdown = async () => {
    await app.close();
    await slugCache.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  await app.listen({ port: config.port, host: "0.0.0.0" });
  console.log(`@qira/api listening on http://localhost:${config.port}`);
}

main().catch((err) => {
  console.error("Failed to start @qira/api:", err);
  process.exit(1);
});
