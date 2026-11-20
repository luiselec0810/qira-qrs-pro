# API Contract (apps/api)

Single source of truth shared by `apps/api` and `apps/web`. Request validation uses the zod schemas
exported by `@qira/shared` (`createQrSchema`, `updateQrSchema`, `routingRuleInputSchema`,
`cardDesignSchema`, `createBatchSchema`).

- Base: `API_URL` (default `http://localhost:4000`).
- Authenticated routes live under `/api/v1/*` and require header `x-api-key` (one of `API_KEYS`, format `key:userId`). The key resolves the `userId`; every query is scoped by it.
- The web dashboard never sends the key from the browser: it calls `/api/proxy/*` (Next route handler) which forwards to `/api/v1/*`.
- Errors: `{ "message": string, "details"?: unknown }` with 400 (validation, zod `flatten()` in `details`), 401, 404, 409, 413, 415, 500.
- Dates are ISO strings. `BigInt` scan ids are never exposed.

## DTOs

```ts
type RuleDto = { id: string; ruleType: "schedule" | "device" | "language"; conditionData: object; targetUrl: string; priority: number };

type QrDto = {
  id: string; name: string; slug: string;
  shortUrl: string;                 // `${BASE_URL}/q/${slug}` — the ONLY payload encoded in the QR image
  landingUrl: string | null;        // `${BASE_URL}/p/${slug}` when destinationType !== "url"
  destinationType: "url" | "vcard" | "hub";
  defaultUrl: string | null; landingData: LandingData | null; fallbackUrl: string | null;
  expiresAt: string | null; hasPin: boolean;   // pinCode hash is never returned
  timezone: string; utmParams: UtmParams; webhookUrl: string | null;
  styleConfig: QrStyleConfig;       // normalized with normalizeQrStyle()
  status: "active" | "paused"; batchId: string | null;
  rules: RuleDto[];                 // sorted by priority asc
  scanCount: number;
  createdAt: string; updatedAt: string;
};

type CardDto = {
  id: string; name: string; qrId: string | null; widthCm: number; heightCm: number; bleedMm: number;
  isDoubleSided: boolean; frontCanvasJson: CanvasDoc; backCanvasJson: CanvasDoc | null;
  thumbnailUrl: string | null; createdAt: string; updatedAt: string;
};
```

`CanvasDoc` is owned by the Print Studio (see `apps/web/src/components/studio/types.ts`); the API stores it as opaque JSON.

## QR codes (RF-01, RF-02, RF-06.2)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/v1/qrs?search=&status=&batchId=` | — | `{ items: QrDto[] }` newest first |
| POST | `/api/v1/qrs` | `createQrSchema` (+ optional `rules`) | `201 QrDto` |
| GET | `/api/v1/qrs/:id` | — | `QrDto` |
| PATCH | `/api/v1/qrs/:id` | `updateQrSchema`; `rules` present ⇒ replaces all rules; `pinCode: null` removes PIN | `QrDto` |
| DELETE | `/api/v1/qrs/:id` | — | `204` |
| PUT | `/api/v1/qrs/:id/rules` | `{ rules: RoutingRuleInput[] }` | `QrDto` |
| POST | `/api/v1/qrs/:id/webhook-test` | — | `{ ok: boolean; status: number \| null; error?: string }` |

Every mutation invalidates the Redis key `qr:slug:{slug}` (RNF-01). The slug never changes (RF-01.2).

## Batches (RF-04.2)

| POST | `/api/v1/batches` | `createBatchSchema` | `201 { batchId: string; items: Array<QrDto & { row: Record<string,string> }>; errors: Array<{ rowIndex: number; message: string }> }` |

Each row creates one QR: name = `${namePrefix} ${index+1}` (or `{{name}}` column if present), `defaultUrl = sanitizeUrl(applyTemplate(defaultUrlTemplate, row, { encode: true }))`. `items` keeps CSV row order. Rendering of the N cards happens in the browser (Print Studio renderer).

## Card designs (RF-03)

| GET | `/api/v1/cards` | — | `{ items: CardDto[] }` (updatedAt desc) |
| POST | `/api/v1/cards` | `cardDesignSchema` | `201 CardDto` |
| GET | `/api/v1/cards/:id` | — | `CardDto` |
| PATCH | `/api/v1/cards/:id` | partial `cardDesignSchema` | `CardDto` |
| DELETE | `/api/v1/cards/:id` | — | `204` |

## Assets (RNF-03)

| POST | `/api/v1/assets` | multipart field `file` (max 10 MB) | `201 { url: string; mime: string; size: number }` |

Only `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, verified by **magic bytes** (SVG: XML/`<svg` sniff and rejected if it contains `<script`, `on*=` handlers or `javascript:`). Local driver serves files at `GET /uploads/:file` (proxied by Next under the same path, so `url` is `${BASE_URL}/uploads/...`); S3 driver returns `S3_PUBLIC_URL/...`. Responses include `Access-Control-Allow-Origin: *` so canvases are not tainted.

## Analytics (RF-06.1)

| GET | `/api/v1/analytics?from=&to=&qrId=&granularity=day\|hour&tz=` | — | see below |

```ts
{
  totals: { scans: number; unique: number };
  series: Array<{ bucket: string; scans: number; unique: number }>;   // zero-filled buckets
  byOs: Array<{ os: string; count: number }>;
  byDevice: Array<{ deviceType: string; count: number }>;
  topCities: Array<{ city: string; country: string | null; count: number }>;  // top 10
  topQrs: Array<{ qrId: string; name: string; slug: string; scans: number }>; // top 10, global view only
}
```

Defaults: last 30 days, `granularity=day`, `tz=America/Bogota`. Unique = distinct `visitorHash` (daily salted SHA-256 of `IP + User-Agent`).

## Public (no API key)

| GET | `/q/:slug` | Redirect engine (RF-02): `302` to the resolved URL, PIN HTML form, or "campaign ended" HTML (`410`). Unknown slug ⇒ `404` HTML. |
| POST | `/q/:slug/unlock` | form `pin` ⇒ sets signed httpOnly cookie `qpin_{slug}` (12 h) and `303` back to `/q/:slug`; wrong PIN ⇒ form with error (`401`). Rate-limited. |
| GET | `/api/public/landings/:slug` | `PublicLanding` (only when `destinationType` is `vcard`/`hub` and the QR is active and not expired; else 404) |
| GET | `/api/public/landings/:slug/vcard` | `text/vcard; charset=utf-8` attachment (`vcardFileName`) |
| GET | `/health` | `{ ok: true, redis: boolean, db: boolean }` |

## Webhook payload (RF-02.5, n8n compatible)

`POST webhookUrl`, `content-type: application/json`, 5 s timeout, fire-and-forget (never delays the 302):

```json
{
  "event": "qr.scanned",
  "qr": { "id": "…", "slug": "…", "name": "…" },
  "scan": { "scannedAt": "ISO", "resolvedUrl": "…", "reason": "rule|default|landing|fallback", "os": "iOS", "deviceType": "mobile", "language": "es", "country": null, "city": null, "visitorHash": "…", "userAgent": "…", "referer": null }
}
```
