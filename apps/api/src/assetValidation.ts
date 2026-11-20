export type SupportedImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";

export interface ValidatedAsset {
  mime: SupportedImageMime;
  ext: "png" | "jpg" | "webp" | "svg";
}

export class InvalidAssetError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 415) {
    super(message);
    this.name = "InvalidAssetError";
    this.statusCode = statusCode;
  }
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const RIFF_MAGIC = Buffer.from("RIFF", "ascii");
const WEBP_MAGIC = Buffer.from("WEBP", "ascii");

const DANGEROUS_SVG_PATTERNS: RegExp[] = [
  /<\s*script\b/i,
  /<\s*foreignObject\b/i,
  /\bon[a-z0-9_]+\s*=/i,
  /javascript\s*:/i,
];

/**
 * Inspects file magic bytes (never trusting the client-supplied Content-Type)
 * and rejects dangerous SVG payloads (RNF-03).
 */
export function validateAssetBuffer(buf: Buffer): ValidatedAsset {
  if (buf.length === 0) {
    throw new InvalidAssetError("Uploaded file is empty", 400);
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) {
    return { mime: "image/png", ext: "png" };
  }

  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf.subarray(0, 3).equals(JPEG_MAGIC)) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).equals(RIFF_MAGIC) &&
    buf.subarray(8, 12).equals(WEBP_MAGIC)
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // SVG sniff: UTF-8 text starting with XML declaration, comment, or <svg and containing <svg
  const head = buf.subarray(0, Math.min(buf.length, 4096)).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  if ((head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<!--")) && /<svg[\s>]/i.test(head)) {
    const fullText = buf.toString("utf8");
    for (const pattern of DANGEROUS_SVG_PATTERNS) {
      if (pattern.test(fullText)) {
        throw new InvalidAssetError("SVG contains potentially unsafe scripts or event handlers", 400);
      }
    }
    return { mime: "image/svg+xml", ext: "svg" };
  }

  throw new InvalidAssetError("Unsupported file type; only PNG, JPEG, WebP, and safe SVG are allowed", 415);
}
