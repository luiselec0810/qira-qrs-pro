import type { SupportedImageMime } from "../assetValidation";

export interface StoredAsset {
  url: string;
  mime: SupportedImageMime;
  size: number;
}

export interface AssetStorage {
  save(params: { buffer: Buffer; mime: SupportedImageMime; ext: string }): Promise<StoredAsset>;
}
