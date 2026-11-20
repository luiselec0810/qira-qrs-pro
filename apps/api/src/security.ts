import crypto from "node:crypto";

const SCRYPT_KEYLEN = 32;

/**
 * Hashes a PIN code using scrypt: `scrypt$<saltHex>$<hashHex>`.
 */
export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(pin, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifies a plain PIN against a stored `scrypt$salt$hash` string in constant time.
 */
export function verifyPin(pin: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(pin, salt, expected.length);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/**
 * Computes a deterministic token bound to the current PIN hash so changing the PIN
 * invalidates existing unlock cookies.
 */
export function pinCookieToken(slug: string, pinHash: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${slug}:${pinHash}`).digest("hex");
}

/**
 * Constant-time string comparison.
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still run timingSafeEqual against itself to avoid length-only short-circuit timing jitter
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Resolves `x-api-key` against configured `apiKey -> userId` map using constant-time comparison.
 */
export function resolveApiKey(providedKey: string | undefined, apiKeys: Map<string, string>): string | null {
  if (!providedKey) return null;
  let matchedUserId: string | null = null;
  for (const [key, userId] of apiKeys.entries()) {
    if (safeCompare(providedKey, key)) {
      matchedUserId = userId;
    }
  }
  return matchedUserId;
}

/**
 * Daily salted SHA-256 visitor hash: `sha256(${YYYY-MM-DD UTC}:${COOKIE_SECRET}:${ip}:${userAgent})`.
 */
export function computeVisitorHash(now: Date, secret: string, ip: string, userAgent: string | undefined): string {
  const day = now.toISOString().slice(0, 10);
  return crypto
    .createHash("sha256")
    .update(`${day}:${secret}:${ip}:${userAgent ?? ""}`)
    .digest("hex");
}
