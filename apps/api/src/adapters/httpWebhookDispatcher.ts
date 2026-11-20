import type {
  WebhookDispatcher,
  WebhookDispatchResult,
  WebhookPayload,
} from "../ports/webhookDispatcher";

export class HttpWebhookDispatcher implements WebhookDispatcher {
  constructor(private readonly timeoutMs = 5000) {}

  async dispatch(url: string, payload: WebhookPayload): Promise<WebhookDispatchResult> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "QiraQRsPro-Webhook/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return {
        ok: response.ok,
        status: response.status,
        ...(response.ok ? {} : { error: `HTTP ${response.status}` }),
      };
    } catch (err) {
      return {
        ok: false,
        status: null,
        error: (err as Error).message,
      };
    }
  }
}
