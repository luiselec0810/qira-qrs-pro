/** Alphabet without visually ambiguous characters (0/O, 1/l/I). */
export const SLUG_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export const SLUG_MIN_LENGTH = 6;
export const SLUG_MAX_LENGTH = 8;
export const SLUG_PATTERN = /^[a-zA-Z0-9]{6,8}$/;

/**
 * Generates a cryptographically random slug (RF-01.1).
 * Uses rejection sampling so every character is uniformly distributed.
 */
export function generateSlug(length = 7): string {
  if (length < SLUG_MIN_LENGTH || length > SLUG_MAX_LENGTH) {
    throw new RangeError(`Slug length must be between ${SLUG_MIN_LENGTH} and ${SLUG_MAX_LENGTH}`);
  }
  const n = SLUG_ALPHABET.length;
  const limit = 256 - (256 % n);
  let out = "";
  while (out.length < length) {
    const bytes = new Uint8Array(length * 2);
    globalThis.crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < limit) out += SLUG_ALPHABET[b % n];
      if (out.length === length) break;
    }
  }
  return out;
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function buildShortUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/q/${slug}`;
}

export function buildLandingUrl(baseUrl: string, slug: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/p/${slug}`;
}
