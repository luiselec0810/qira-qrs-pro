export interface WebhookPayload {
  event: "qr.scanned";
  qr: {
    id: string;
    slug: string;
    name: string;
  };
  scan: {
    scannedAt: string;
    resolvedUrl: string;
    reason: "rule" | "default" | "landing" | "fallback";
    os: string;
    deviceType: string;
    language: string | null;
    country: string | null;
    city: string | null;
    visitorHash: string;
    userAgent: string | null;
    referer: string | null;
  };
}

export interface WebhookDispatchResult {
  ok: boolean;
  status: number | null;
  error?: string;
}

export interface WebhookDispatcher {
  dispatch(url: string, payload: WebhookPayload): Promise<WebhookDispatchResult>;
}
