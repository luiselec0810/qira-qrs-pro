import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { loadConfig, parseApiKeys } from "../src/config";
import {
  InMemoryAssetStorage,
  InMemoryCardRepository,
  InMemoryQrRepository,
  InMemoryScanSink,
  InMemorySlugCache,
  InMemoryWebhookDispatcher,
} from "../src/adapters/inMemoryAdapters";

const API_KEY = "dev-key-change-me";
const OTHER_KEY = "other-key";

async function createTestHarness(fixedNow = new Date("2026-06-15T14:00:00.000Z")) {
  let currentNow = fixedNow;
  const qrRepo = new InMemoryQrRepository();
  const cardRepo = new InMemoryCardRepository();
  const slugCache = new InMemorySlugCache();
  const scanSink = new InMemoryScanSink(qrRepo);
  const webhookDispatcher = new InMemoryWebhookDispatcher();
  const assetStorage = new InMemoryAssetStorage("http://localhost:3000");

  const config = loadConfig({
    baseUrl: "http://localhost:3000",
    apiUrl: "http://localhost:4000",
    cookieSecret: "test-secret-for-pin-cookies-and-hashes",
    apiKeys: parseApiKeys(`${API_KEY}:demo-user,${OTHER_KEY}:other-user`),
    storageDriver: "s3", // avoid mounting static dir in unit tests
  });

  const app = await buildApp({
    config,
    qrRepo,
    cardRepo,
    slugCache,
    scanSink,
    webhookDispatcher,
    assetStorage,
    clock: () => currentNow,
  });

  return {
    app,
    qrRepo,
    cardRepo,
    slugCache,
    scanSink,
    webhookDispatcher,
    assetStorage,
    setNow: (d: Date) => {
      currentNow = d;
    },
  };
}

function flushImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function buildMultipartPayload(filename: string, mime: string, content: Buffer) {
  const boundary = "----QiraMultipartBoundary7MA4YWxkTrZu0gW";
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
    "utf8",
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([head, content, tail]),
  };
}

describe("@qira/api contract and redirect engine", () => {
  it("returns 401 when x-api-key is missing or invalid", async () => {
    const { app } = await createTestHarness();

    const noKey = await app.inject({ method: "GET", url: "/api/v1/qrs" });
    expect(noKey.statusCode).toBe(401);

    const badKey = await app.inject({
      method: "GET",
      url: "/api/v1/qrs",
      headers: { "x-api-key": "wrong-key" },
    });
    expect(badKey.statusCode).toBe(401);
  });

  it("scopes QR codes and cards strictly by userId", async () => {
    const { app } = await createTestHarness();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/qrs",
      headers: { "x-api-key": API_KEY },
      payload: {
        name: "Demo User QR",
        destinationType: "url",
        defaultUrl: "https://example.com/demo",
      },
    });
    expect(created.statusCode).toBe(201);
    const qr = created.json();

    // Other user cannot see, fetch, patch, or delete Demo User's QR
    const listOther = await app.inject({
      method: "GET",
      url: "/api/v1/qrs",
      headers: { "x-api-key": OTHER_KEY },
    });
    expect(listOther.statusCode).toBe(200);
    expect(listOther.json().items).toHaveLength(0);

    const getOther = await app.inject({
      method: "GET",
      url: `/api/v1/qrs/${qr.id}`,
      headers: { "x-api-key": OTHER_KEY },
    });
    expect(getOther.statusCode).toBe(404);

    const patchOther = await app.inject({
      method: "PATCH",
      url: `/api/v1/qrs/${qr.id}`,
      headers: { "x-api-key": OTHER_KEY },
      payload: { name: "Hijacked" },
    });
    expect(patchOther.statusCode).toBe(404);
  });

  it("evaluates redirect order: paused -> fallback, expired -> 410 ended, rule match, and UTM injection", async () => {
    // 2026-06-15T14:00:00Z is Monday 09:00 in America/Bogota (UTC-5)
    const { app, setNow } = await createTestHarness(new Date("2026-06-15T14:00:00.000Z"));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/qrs",
      headers: { "x-api-key": API_KEY },
      payload: {
        name: "Restaurant Menu",
        destinationType: "url",
        defaultUrl: "https://restaurant.example.com/default",
        fallbackUrl: "https://restaurant.example.com/fallback",
        timezone: "America/Bogota",
        utmParams: { utm_source: "qr", utm_medium: "table", utm_campaign: "lunch" },
        rules: [
          {
            ruleType: "device",
            conditionData: { os: ["iOS"] },
            targetUrl: "https://restaurant.example.com/ios-app",
            priority: 1,
          },
          {
            ruleType: "language",
            conditionData: { languages: ["es"] },
            targetUrl: "https://restaurant.example.com/es",
            priority: 2,
          },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const qr = res.json();

    // 1. Rule match (iOS) + UTM injection
    const iosHit = await app.inject({
      method: "GET",
      url: `/q/${qr.slug}`,
      headers: { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" },
    });
    expect(iosHit.statusCode).toBe(302);
    expect(iosHit.headers["cache-control"]).toBe("no-store");
    expect(iosHit.headers.location).toBe(
      "https://restaurant.example.com/ios-app?utm_source=qr&utm_medium=table&utm_campaign=lunch",
    );

    // 2. Default destination + UTM when no rule matches
    const defaultHit = await app.inject({
      method: "GET",
      url: `/q/${qr.slug}`,
      headers: {
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64)",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    expect(defaultHit.statusCode).toBe(302);
    expect(defaultHit.headers.location).toBe(
      "https://restaurant.example.com/default?utm_source=qr&utm_medium=table&utm_campaign=lunch",
    );

    // 3. Paused with fallbackUrl -> redirects 302 to fallbackUrl
    await app.inject({
      method: "PATCH",
      url: `/api/v1/qrs/${qr.id}`,
      headers: { "x-api-key": API_KEY },
      payload: { status: "paused" },
    });
    const pausedFallback = await app.inject({ method: "GET", url: `/q/${qr.slug}` });
    expect(pausedFallback.statusCode).toBe(302);
    expect(pausedFallback.headers.location).toBe("https://restaurant.example.com/fallback");

    // 4. Expired without fallbackUrl -> 410 Campaign Ended HTML
    await app.inject({
      method: "PATCH",
      url: `/api/v1/qrs/${qr.id}`,
      headers: { "x-api-key": API_KEY },
      payload: {
        status: "active",
        fallbackUrl: null,
        expiresAt: "2026-06-10T00:00:00.000Z",
      },
    });
    setNow(new Date("2026-06-15T14:00:00.000Z"));
    const expiredHit = await app.inject({ method: "GET", url: `/q/${qr.slug}` });
    expect(expiredHit.statusCode).toBe(410);
    expect(expiredHit.headers["content-type"]).toContain("text/html");
    expect(expiredHit.body).toContain("Campaña Finalizada");
  });

  it("enforces PIN protection: renders PIN form -> wrong PIN 401 -> unlock 303 cookie -> redirect, and invalidates cookie on PIN change", async () => {
    const { app } = await createTestHarness();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/qrs",
      headers: { "x-api-key": API_KEY },
      payload: {
        name: "VIP Access",
        destinationType: "url",
        defaultUrl: "https://vip.example.com/secret",
        pinCode: "1234",
      },
    });
    expect(created.statusCode).toBe(201);
    const qr = created.json();
    expect(qr.hasPin).toBe(true);
    expect(qr.pinCode).toBeUndefined();

    // 1. Without cookie -> renders HTML PIN form
    const pinForm = await app.inject({ method: "GET", url: `/q/${qr.slug}` });
    expect(pinForm.statusCode).toBe(200);
    expect(pinForm.headers["content-type"]).toContain("text/html");
    expect(pinForm.body).toContain(`action="/q/${qr.slug}/unlock"`);

    // 2. Wrong PIN -> 401 with error message
    const wrongUnlock = await app.inject({
      method: "POST",
      url: `/q/${qr.slug}/unlock`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "pin=9999",
    });
    expect(wrongUnlock.statusCode).toBe(401);
    expect(wrongUnlock.body).toContain("PIN incorrecto");

    // 3. Correct PIN -> 303 + signed cookie
    const rightUnlock = await app.inject({
      method: "POST",
      url: `/q/${qr.slug}/unlock`,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: "pin=1234",
    });
    expect(rightUnlock.statusCode).toBe(303);
    expect(rightUnlock.headers.location).toBe(`/q/${qr.slug}`);
    const setCookieHeader = rightUnlock.headers["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    const cookiePair = (Array.isArray(setCookieHeader) ? setCookieHeader[0]! : setCookieHeader!).split(";")[0]!;

    // 4. With valid signed cookie -> 302 redirect
    const unlockedHit = await app.inject({
      method: "GET",
      url: `/q/${qr.slug}`,
      headers: { cookie: cookiePair },
    });
    expect(unlockedHit.statusCode).toBe(302);
    expect(unlockedHit.headers.location).toBe("https://vip.example.com/secret");

    // 5. Changing the PIN invalidates the old cookie
    await app.inject({
      method: "PATCH",
      url: `/api/v1/qrs/${qr.id}`,
      headers: { "x-api-key": API_KEY },
      payload: { pinCode: "5678" },
    });
    const afterPinChange = await app.inject({
      method: "GET",
      url: `/q/${qr.slug}`,
      headers: { cookie: cookiePair },
    });
    expect(afterPinChange.statusCode).toBe(200);
    expect(afterPinChange.body).toContain("Enlace Protegido");
  });

  it("invokes scan tracking and webhook dispatcher asynchronously after sending 302 reply", async () => {
    const { app, qrRepo, webhookDispatcher } = await createTestHarness();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/qrs",
      headers: { "x-api-key": API_KEY },
      payload: {
        name: "Tracked Webhook QR",
        destinationType: "url",
        defaultUrl: "https://tracked.example.com",
        webhookUrl: "https://hooks.example.com/n8n",
      },
    });
    const qr = created.json();

    const res = await app.inject({
      method: "GET",
      url: `/q/${qr.slug}`,
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36",
        "accept-language": "es-CO,es;q=0.9",
        "cf-ipcountry": "CO",
        "cf-ipcity": "Bogot%C3%A1",
      },
    });
    expect(res.statusCode).toBe(302);

    await flushImmediate();

    expect(qrRepo.scans).toHaveLength(1);
    expect(qrRepo.scans[0]).toMatchObject({
      qrId: qr.id,
      country: "CO",
      city: "Bogotá",
      os: "Android",
      deviceType: "mobile",
      resolvedUrl: "https://tracked.example.com/",
    });

    expect(webhookDispatcher.dispatched).toHaveLength(1);
    expect(webhookDispatcher.dispatched[0]!.url).toBe("https://hooks.example.com/n8n");
    expect(webhookDispatcher.dispatched[0]!.payload).toMatchObject({
      event: "qr.scanned",
      qr: { id: qr.id, slug: qr.slug, name: "Tracked Webhook QR" },
      scan: {
        resolvedUrl: "https://tracked.example.com/",
        reason: "default",
        os: "Android",
        deviceType: "mobile",
        language: "es",
        country: "CO",
        city: "Bogotá",
      },
    });
  });

  it("populates slug cache on GET /q/:slug and invalidates it on PATCH /api/v1/qrs/:id", async () => {
    const { app, slugCache } = await createTestHarness();

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/qrs",
      headers: { "x-api-key": API_KEY },
      payload: {
        name: "Cached QR",
        destinationType: "url",
        defaultUrl: "https://v1.example.com",
      },
    });
    const qr = created.json();
    expect(slugCache.store.has(qr.slug)).toBe(false);

    // First redirect populates cache
    const hit1 = await app.inject({ method: "GET", url: `/q/${qr.slug}` });
    expect(hit1.statusCode).toBe(302);
    expect(hit1.headers.location).toBe("https://v1.example.com/");
    expect(slugCache.store.has(qr.slug)).toBe(true);

    // PATCH invalidates cache
    const patched = await app.inject({
      method: "PATCH",
      url: `/api/v1/qrs/${qr.id}`,
      headers: { "x-api-key": API_KEY },
      payload: { defaultUrl: "https://v2.example.com" },
    });
    expect(patched.statusCode).toBe(200);
    expect(slugCache.store.has(qr.slug)).toBe(false);

    // Next redirect sees updated destination
    const hit2 = await app.inject({ method: "GET", url: `/q/${qr.slug}` });
    expect(hit2.statusCode).toBe(302);
    expect(hit2.headers.location).toBe("https://v2.example.com/");
  });

  it("validates asset magic bytes and rejects spoofed binaries or malicious SVGs", async () => {
    const { app } = await createTestHarness();

    // 1. Valid PNG magic bytes -> 201
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const validPng = buildMultipartPayload("logo.png", "image/png", pngBytes);
    const resPng = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      headers: { "x-api-key": API_KEY, "content-type": validPng.contentType },
      payload: validPng.body,
    });
    expect(resPng.statusCode).toBe(201);
    expect(resPng.json()).toMatchObject({
      mime: "image/png",
      size: pngBytes.length,
    });
    expect(resPng.headers["access-control-allow-origin"]).toBe("*");

    // 2. Spoofed EXE claiming image/png -> 415
    const badBinary = buildMultipartPayload("evil.png", "image/png", Buffer.from("MZ-not-a-png-file", "utf8"));
    const resBad = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      headers: { "x-api-key": API_KEY, "content-type": badBinary.contentType },
      payload: badBinary.body,
    });
    expect(resBad.statusCode).toBe(415);

    // 3. Malicious SVG with <script> or onload= -> 400
    const maliciousSvg = buildMultipartPayload(
      "xss.svg",
      "image/svg+xml",
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>', "utf8"),
    );
    const resXss = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      headers: { "x-api-key": API_KEY, "content-type": maliciousSvg.contentType },
      payload: maliciousSvg.body,
    });
    expect(resXss.statusCode).toBe(400);

    // 4. Clean SVG -> 201
    const cleanSvg = buildMultipartPayload(
      "clean.svg",
      "image/svg+xml",
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>', "utf8"),
    );
    const resCleanSvg = await app.inject({
      method: "POST",
      url: "/api/v1/assets",
      headers: { "x-api-key": API_KEY, "content-type": cleanSvg.contentType },
      payload: cleanSvg.body,
    });
    expect(resCleanSvg.statusCode).toBe(201);
    expect(resCleanSvg.json().mime).toBe("image/svg+xml");
  });

  it("processes CSV batch creation, skipping invalid URL rows into errors while preserving valid rows", async () => {
    const { app } = await createTestHarness();

    const batchRes = await app.inject({
      method: "POST",
      url: "/api/v1/batches",
      headers: { "x-api-key": API_KEY },
      payload: {
        namePrefix: "Mesa",
        defaultUrlTemplate: "https://menu.example.com/mesa/{{mesa}}",
        rows: [
          { mesa: "1" },
          { mesa: "2" },
          { mesa: "3", name: "Terraza VIP" },
        ],
      },
    });

    expect(batchRes.statusCode).toBe(201);
    const body = batchRes.json();
    expect(body.batchId).toBeTruthy();
    expect(body.items).toHaveLength(3);
    expect(body.items[0].name).toBe("Mesa 1");
    expect(body.items[0].defaultUrl).toBe("https://menu.example.com/mesa/1");
    expect(body.items[2].name).toBe("Terraza VIP");
    expect(body.items[2].defaultUrl).toBe("https://menu.example.com/mesa/3");
    expect(body.errors).toEqual([]);

    // Also test a batch with a bad URL row (e.g. javascript: scheme in template or row)
    const batchWithBadRow = await app.inject({
      method: "POST",
      url: "/api/v1/batches",
      headers: { "x-api-key": API_KEY },
      payload: {
        namePrefix: "Promo",
        defaultUrlTemplate: "{{url}}",
        rows: [
          { url: "https://menu.example.com/promo/1" },
          { url: "javascript:alert(1)" },
          { name: "VIP Promo", url: "https://menu.example.com/promo/3" },
        ],
      },
    });
    expect(batchWithBadRow.statusCode).toBe(201);
    const badBody = batchWithBadRow.json();
    expect(badBody.items).toHaveLength(2);
    expect(badBody.errors).toEqual([
      {
        rowIndex: 1,
        message: expect.stringContaining("not allowed"),
      },
    ]);
  });

  it("aggregates analytics with zero-filled series, distinct unique visitors, OS, device, topCities, and topQrs", async () => {
    const { app, scanSink } = await createTestHarness(new Date("2026-06-15T18:00:00.000Z"));

    const qrRes = await app.inject({
      method: "POST",
      url: "/api/v1/qrs",
      headers: { "x-api-key": API_KEY },
      payload: {
        name: "Analytics Campaign",
        destinationType: "url",
        defaultUrl: "https://analytics.example.com",
      },
    });
    const qr = qrRes.json();

    await scanSink.record({
      qrId: qr.id,
      scannedAt: new Date("2026-06-14T15:00:00.000Z"),
      visitorHash: "visitor-a",
      country: "CO",
      city: "Bogotá",
      os: "iOS",
      deviceType: "mobile",
      resolvedUrl: "https://analytics.example.com/",
    });
    await scanSink.record({
      qrId: qr.id,
      scannedAt: new Date("2026-06-14T16:00:00.000Z"),
      visitorHash: "visitor-a", // duplicate visitor on same day
      country: "CO",
      city: "Bogotá",
      os: "iOS",
      deviceType: "mobile",
      resolvedUrl: "https://analytics.example.com/",
    });
    await scanSink.record({
      qrId: qr.id,
      scannedAt: new Date("2026-06-15T15:00:00.000Z"),
      visitorHash: "visitor-b",
      country: "CO",
      city: "Medellín",
      os: "Android",
      deviceType: "mobile",
      resolvedUrl: "https://analytics.example.com/",
    });

    const analyticsRes = await app.inject({
      method: "GET",
      url: "/api/v1/analytics?from=2026-06-13T12:00:00.000Z&to=2026-06-15T18:00:00.000Z&granularity=day&tz=America/Bogota",
      headers: { "x-api-key": API_KEY },
    });

    expect(analyticsRes.statusCode).toBe(200);
    const report = analyticsRes.json();
    expect(report.totals).toEqual({ scans: 3, unique: 2 });
    expect(report.series).toEqual([
      { bucket: "2026-06-13", scans: 0, unique: 0 },
      { bucket: "2026-06-14", scans: 2, unique: 1 },
      { bucket: "2026-06-15", scans: 1, unique: 1 },
    ]);
    expect(report.byOs).toEqual([
      { os: "iOS", count: 2 },
      { os: "Android", count: 1 },
    ]);
    expect(report.byDevice).toEqual([{ deviceType: "mobile", count: 3 }]);
    expect(report.topCities).toEqual([
      { city: "Bogotá", country: "CO", count: 2 },
      { city: "Medellín", country: "CO", count: 1 },
    ]);
    expect(report.topQrs).toEqual([
      { qrId: qr.id, name: "Analytics Campaign", slug: qr.slug, scans: 3 },
    ]);
  });

  it("supports email+password registration, login, Gmail sign-in, and Bearer token authentication", async () => {
    const { app } = await createTestHarness();

    // 1. Register with email & password
    const regRes = await app.inject({
      method: "POST",
      url: "/api/public/auth/register",
      payload: {
        name: "Laura Gómez",
        email: "laura@example.com",
        password: "secretPassword123",
      },
    });
    expect(regRes.statusCode).toBe(201);
    const regBody = regRes.json();
    expect(regBody.token).toBeTruthy();
    expect(regBody.user).toMatchObject({
      email: "laura@example.com",
      name: "Laura Gómez",
      hasPassword: true,
    });

    // 2. Duplicate registration returns 409
    const dupRes = await app.inject({
      method: "POST",
      url: "/api/public/auth/register",
      payload: {
        name: "Laura 2",
        email: "laura@example.com",
        password: "secretPassword123",
      },
    });
    expect(dupRes.statusCode).toBe(409);

    // 3. Login with email & password
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/public/auth/login",
      payload: {
        email: "laura@example.com",
        password: "secretPassword123",
      },
    });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.json().token).toBeTruthy();

    // 4. Access /api/v1/qrs using Bearer token without x-api-key
    const listRes = await app.inject({
      method: "GET",
      url: "/api/v1/qrs",
      headers: { authorization: `Bearer ${regBody.token}` },
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().items).toEqual([]);

    // 5. Sign in / register via Gmail
    const gmailRes = await app.inject({
      method: "POST",
      url: "/api/public/auth/google",
      payload: {
        email: "carlos@gmail.com",
        name: "Carlos Gmail",
      },
    });
    expect(gmailRes.statusCode).toBe(200);
    expect(gmailRes.json().user).toMatchObject({
      email: "carlos@gmail.com",
      name: "Carlos Gmail",
      hasGoogle: true,
    });
  });
});
