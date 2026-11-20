import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SupportedImageMime } from "../assetValidation";
import type { AssetStorage, StoredAsset } from "../ports/assetStorage";

export class LocalDiskAssetStorage implements AssetStorage {
  constructor(
    private readonly uploadsDir: string,
    private readonly baseUrl: string,
  ) {}

  async save(params: { buffer: Buffer; mime: SupportedImageMime; ext: string }): Promise<StoredAsset> {
    await fs.mkdir(this.uploadsDir, { recursive: true });
    const fileName = `${crypto.randomUUID()}.${params.ext}`;
    const fullPath = path.join(this.uploadsDir, fileName);
    await fs.writeFile(fullPath, params.buffer);
    return {
      url: `${this.baseUrl.replace(/\/+$/, "")}/uploads/${fileName}`,
      mime: params.mime,
      size: params.buffer.length,
    };
  }
}

export interface S3StorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

export class S3AssetStorage implements AssetStorage {
  private readonly client: S3Client;

  constructor(private readonly opts: S3StorageOptions) {
    this.client = new S3Client({
      region: opts.region || "auto",
      ...(opts.endpoint ? { endpoint: opts.endpoint } : {}),
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
    });
  }

  async save(params: { buffer: Buffer; mime: SupportedImageMime; ext: string }): Promise<StoredAsset> {
    const fileName = `${crypto.randomUUID()}.${params.ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.opts.bucket,
        Key: fileName,
        Body: params.buffer,
        ContentType: params.mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return {
      url: `${this.opts.publicUrl.replace(/\/+$/, "")}/${fileName}`,
      mime: params.mime,
      size: params.buffer.length,
    };
  }
}
