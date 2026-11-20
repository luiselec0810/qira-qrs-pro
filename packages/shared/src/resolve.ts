import { evaluateRules, type RequestContext, type RoutingRule } from "./rules";
import { appendUtm, type UtmParams } from "./url";
import { buildLandingUrl } from "./slug";

export type DestinationType = "url" | "vcard" | "hub";
export type QrStatus = "active" | "paused";

/**
 * Minimal, cache-friendly view of a QR needed by the redirect engine.
 * This is exactly what the API stores in Redis under `qr:slug:{slug}`.
 */
export interface QrSnapshot {
  id: string;
  slug: string;
  status: QrStatus;
  destinationType: DestinationType;
  defaultUrl: string | null;
  fallbackUrl: string | null;
  /** ISO string */
  expiresAt: string | null;
  hasPin: boolean;
  timezone: string;
  utmParams: UtmParams;
  webhookUrl: string | null;
  rules: RoutingRule[];
}

export type ResolveResult =
  | { kind: "redirect"; url: string; reason: "fallback" | "rule" | "default" | "landing"; ruleIndex?: number }
  | { kind: "ended" }
  | { kind: "pin_required" };

export interface ResolveOptions {
  baseUrl: string;
  /** True when the visitor holds a valid PIN cookie for this slug. */
  pinUnlocked: boolean;
}

/**
 * Pure redirect decision (RF-02), evaluated in strict order:
 * 1. status / expiration -> fallback or "ended"
 * 2. PIN protection
 * 3. routing rules by ascending priority
 * 4. default destination (external URL or hosted landing /p/{slug})
 * 5. UTM injection
 * Tracking and webhooks are side effects handled by the caller.
 */
export function resolveRedirect(qr: QrSnapshot, ctx: RequestContext, opts: ResolveOptions): ResolveResult {
  const expired = qr.expiresAt !== null && ctx.now.getTime() > new Date(qr.expiresAt).getTime();
  if (qr.status !== "active" || expired) {
    return qr.fallbackUrl ? { kind: "redirect", url: qr.fallbackUrl, reason: "fallback" } : { kind: "ended" };
  }

  if (qr.hasPin && !opts.pinUnlocked) return { kind: "pin_required" };

  const matched = evaluateRules(qr.rules, ctx, qr.timezone);
  if (matched) {
    return {
      kind: "redirect",
      url: appendUtm(matched.targetUrl, qr.utmParams),
      reason: "rule",
      ruleIndex: qr.rules.indexOf(matched),
    };
  }

  if (qr.destinationType !== "url") {
    return { kind: "redirect", url: appendUtm(buildLandingUrl(opts.baseUrl, qr.slug), qr.utmParams), reason: "landing" };
  }

  if (qr.defaultUrl) {
    return { kind: "redirect", url: appendUtm(qr.defaultUrl, qr.utmParams), reason: "default" };
  }

  return qr.fallbackUrl ? { kind: "redirect", url: qr.fallbackUrl, reason: "fallback" } : { kind: "ended" };
}
