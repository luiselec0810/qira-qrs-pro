const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/**
 * Normalizes and validates a destination URL (RNF-03).
 * Only http(s) is allowed; `javascript:`, `data:`, `vbscript:`, `file:` and
 * anything else are rejected. Bare domains ("example.com") get https://.
 */
export function sanitizeUrl(input: string): string {
  // Strip control chars and whitespace that browsers ignore inside schemes ("java\nscript:").
  const cleaned = input.replace(/[\u0000-\u001F\u007F\s]+/g, "").trim();
  if (!cleaned) throw new UnsafeUrlError("URL is empty");

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(cleaned);
  const candidate = hasScheme ? cleaned : `https://${cleaned}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new UnsafeUrlError("URL is not valid");
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new UnsafeUrlError(`Protocol "${parsed.protocol}" is not allowed`);
  }
  if (!parsed.hostname) throw new UnsafeUrlError("URL has no host");
  return parsed.toString();
}

export function isSafeUrl(input: string): boolean {
  try {
    sanitizeUrl(input);
    return true;
  } catch {
    return false;
  }
}

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/** Appends UTM params (RF-02.4). Existing params with the same key are overwritten. */
export function appendUtm(url: string, utm: UtmParams | null | undefined): string {
  if (!utm) return url;
  const entries = Object.entries(utm).filter(
    (e): e is [string, string] => typeof e[1] === "string" && e[1].trim() !== "",
  );
  if (entries.length === 0) return url;
  const parsed = new URL(url);
  for (const [k, v] of entries) parsed.searchParams.set(k, v.trim());
  return parsed.toString();
}
