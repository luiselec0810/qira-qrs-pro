import { describe, expect, it } from "vitest";
import {
  appendUtm,
  applyTemplate,
  buildVCard,
  checkQrContrast,
  cmToPt,
  cmToPx,
  computeImposition,
  createQrSchema,
  detectOs,
  evaluateRules,
  extractVariables,
  generateSlug,
  isValidSlug,
  matchesSchedule,
  normalizeQrStyle,
  parseAcceptLanguage,
  parseCsv,
  resolveRedirect,
  sanitizeUrl,
  type QrSnapshot,
  type RoutingRule,
} from "./index";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

describe("slug (RF-01.1)", () => {
  it("generates valid unique-looking slugs within 6-8 chars", () => {
    const set = new Set(Array.from({ length: 500 }, () => generateSlug()));
    expect(set.size).toBe(500);
    for (const s of set) expect(isValidSlug(s)).toBe(true);
    expect(() => generateSlug(5)).toThrow();
    expect(generateSlug(8)).toHaveLength(8);
  });
});

describe("sanitizeUrl (RNF-03)", () => {
  it("rejects dangerous schemes, including obfuscated ones", () => {
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "java\nscript:alert(1)", "data:text/html,<b>", "vbscript:x", "file:///etc/passwd"]) {
      expect(() => sanitizeUrl(bad)).toThrow();
    }
  });
  it("normalizes bare domains to https", () => {
    expect(sanitizeUrl("example.com/menu")).toBe("https://example.com/menu");
  });
  it("appends UTM params", () => {
    const url = appendUtm("https://x.com/a?b=1", { utm_source: "qr", utm_campaign: "fall", utm_medium: "" });
    expect(url).toBe("https://x.com/a?b=1&utm_source=qr&utm_campaign=fall");
  });
});

describe("rules (RF-02.3)", () => {
  it("detects OS and languages", () => {
    expect(detectOs(IPHONE)).toBe("iOS");
    expect(detectOs(ANDROID)).toBe("Android");
    expect(detectOs(DESKTOP)).toBe("Desktop");
    expect(parseAcceptLanguage("en-US,es;q=0.9,pt;q=0.95")).toEqual(["en", "pt", "es"]);
  });

  it("evaluates schedules in the QR timezone, including overnight windows", () => {
    // 2026-11-20 is a Friday. 17:30 UTC = 12:30 in Bogota (UTC-5).
    const now = new Date("2026-11-20T17:30:00Z");
    expect(matchesSchedule({ days: [1, 2, 3, 4, 5], start: "12:00", end: "15:00" }, now, "America/Bogota")).toBe(true);
    expect(matchesSchedule({ days: [0, 6], start: "12:00", end: "15:00" }, now, "America/Bogota")).toBe(false);
    // Saturday 01:00 Bogota = 06:00Z Saturday; Friday 22:00-02:00 window should match.
    const lateNight = new Date("2026-11-21T06:00:00Z");
    expect(matchesSchedule({ days: [5], start: "22:00", end: "02:00" }, lateNight, "America/Bogota")).toBe(true);
  });

  it("returns the first matching rule by ascending priority", () => {
    const rules: RoutingRule[] = [
      { ruleType: "language", conditionData: { languages: ["es"] }, targetUrl: "https://es.example.com/", priority: 3 },
      { ruleType: "device", conditionData: { os: ["iOS"] }, targetUrl: "https://apps.apple.com/", priority: 2 },
    ];
    const ctx = { now: new Date(), userAgent: IPHONE, acceptLanguage: "es-CO" };
    expect(evaluateRules(rules, ctx, "UTC")?.targetUrl).toBe("https://apps.apple.com/");
    expect(evaluateRules(rules, { ...ctx, userAgent: DESKTOP }, "UTC")?.targetUrl).toBe("https://es.example.com/");
    expect(evaluateRules(rules, { ...ctx, userAgent: DESKTOP, acceptLanguage: "en" }, "UTC")).toBeNull();
  });
});

describe("resolveRedirect (RF-02)", () => {
  const base: QrSnapshot = {
    id: "1",
    slug: "abc2345",
    status: "active",
    destinationType: "url",
    defaultUrl: "https://example.com/",
    fallbackUrl: "https://example.com/ended",
    expiresAt: null,
    hasPin: false,
    timezone: "America/Bogota",
    utmParams: { utm_source: "qr" },
    webhookUrl: null,
    rules: [],
  };
  const ctx = { now: new Date("2026-11-20T17:30:00Z"), userAgent: DESKTOP, acceptLanguage: "es" };
  const opts = { baseUrl: "https://qira.app", pinUnlocked: false };

  it("uses fallback when paused or expired, ended when no fallback", () => {
    expect(resolveRedirect({ ...base, status: "paused" }, ctx, opts)).toMatchObject({ kind: "redirect", reason: "fallback" });
    expect(resolveRedirect({ ...base, expiresAt: "2026-01-01T00:00:00Z", fallbackUrl: null }, ctx, opts)).toEqual({ kind: "ended" });
  });
  it("requires PIN before evaluating rules", () => {
    expect(resolveRedirect({ ...base, hasPin: true }, ctx, opts)).toEqual({ kind: "pin_required" });
    expect(resolveRedirect({ ...base, hasPin: true }, ctx, { ...opts, pinUnlocked: true }).kind).toBe("redirect");
  });
  it("injects UTM into default and landing destinations", () => {
    expect(resolveRedirect(base, ctx, opts)).toMatchObject({ url: "https://example.com/?utm_source=qr", reason: "default" });
    expect(resolveRedirect({ ...base, destinationType: "vcard" }, ctx, opts)).toMatchObject({
      url: "https://qira.app/p/abc2345?utm_source=qr",
      reason: "landing",
    });
  });
});

describe("contrast (RF-01.4)", () => {
  it("flags low contrast and handles gradients and transparency", () => {
    expect(checkQrContrast(["#000000"], ["#ffffff"]).ratio).toBe(21);
    expect(checkQrContrast(["#cccccc"], ["#ffffff"]).ok).toBe(false);
    const gradient = checkQrContrast(["#000000", "#eeeeee"], ["#ffffff"]);
    expect(gradient.ok).toBe(false);
    const transparent = checkQrContrast(["#000000"], ["rgba(0,0,0,0)"]);
    expect(transparent).toMatchObject({ ok: true, assumedSurface: true });
  });
});

describe("units & imposition (RF-03.2, RF-04.3)", () => {
  it("converts cm to 300 DPI pixels and points exactly", () => {
    expect(cmToPx(10)).toBe(1181);
    expect(cmToPx(15)).toBe(1772);
    expect(cmToPx(9)).toBe(1063);
    expect(cmToPt(1)).toBeCloseTo(28.3465, 4);
  });

  it("fits business cards on a letter sheet with 8 marks per card", () => {
    const layout = computeImposition({
      sheetWidthCm: 21.59,
      sheetHeightCm: 27.94,
      cardWidthCm: 9,
      cardHeightCm: 5,
      bleedMm: 3,
      gapMm: 4,
      marginMm: 8,
      allowRotation: true,
    });
    expect(layout.rotated).toBe(false);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(4);
    expect(layout.cutMarks).toHaveLength(layout.perSheet * 8);
    for (const p of layout.placements) {
      expect(p.x).toBeGreaterThanOrEqual(0.8 - 1e-9);
      expect(p.x + layout.cellWidthCm).toBeLessThanOrEqual(21.59 - 0.8 + 1e-9);
    }
    const mark = layout.cutMarks[0]!;
    expect(Math.hypot(mark.x2 - mark.x1, mark.y2 - mark.y1)).toBeCloseTo(0.4, 9);
  });
});

describe("templates & CSV (RF-04.2)", () => {
  it("parses quoted CSV with ; delimiter and substitutes variables", () => {
    const { headers, rows } = parseCsv('\uFEFFmesa;zona\r\n1;"Terraza; norte"\r\n2;"Sala ""VIP"""\r\n');
    expect(headers).toEqual(["mesa", "zona"]);
    expect(rows[1]).toEqual({ mesa: "2", zona: 'Sala "VIP"' });
    expect(extractVariables("Mesa {{mesa}}", "https://x.com/?m={{ mesa }}&z={{zona}}")).toEqual(["mesa", "zona"]);
    expect(applyTemplate("https://x.com/?z={{zona}}", rows[0]!, { encode: true })).toBe("https://x.com/?z=Terraza%3B%20norte");
  });
});

describe("vcard & style (RF-05.2, RF-01.3)", () => {
  it("builds escaped vCard 3.0", () => {
    const v = buildVCard({ firstName: "Ana", lastName: "Pérez", company: "ACME, S.A.", phone: "+57 300 000 0000" });
    expect(v).toContain("VERSION:3.0\r\n");
    expect(v).toContain("ORG:ACME\\, S.A.");
    expect(v.endsWith("END:VCARD\r\n")).toBe(true);
  });
  it("forces error correction H when a logo is present", () => {
    const s = normalizeQrStyle({ image: "https://cdn/logo.png", errorCorrectionLevel: "L" });
    expect(s.errorCorrectionLevel).toBe("H");
    expect(s.imageOptions.hideBackgroundDots).toBe(true);
  });
  it("validates QR creation input", () => {
    expect(createQrSchema.safeParse({ name: "x", defaultUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(createQrSchema.safeParse({ name: "x", destinationType: "url" }).success).toBe(false);
    const ok = createQrSchema.parse({ name: "x", defaultUrl: "example.com" });
    expect(ok.defaultUrl).toBe("https://example.com/");
  });
});
