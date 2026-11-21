export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #060b14;
      background-image: radial-gradient(ellipse 65% 45% at 50% 0%, rgba(14, 165, 233, 0.2), transparent 70%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      width: 100%;
      max-width: 400px;
      background: #0c1424;
      border: 1px solid rgba(56, 189, 248, 0.18);
      border-radius: 1.25rem;
      padding: 2rem;
      box-shadow: 0 24px 48px -15px rgba(2, 6, 23, 0.85);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      border-radius: 9999px;
      background: rgba(37, 99, 235, 0.18);
      color: #38bdf8;
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #8b9bb4; line-height: 1.5; margin-bottom: 1.5rem; }
    form { display: flex; flex-direction: column; gap: 0.75rem; }
    input[type="password"] {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1.125rem;
      letter-spacing: 0.25em;
      text-align: center;
      border-radius: 0.75rem;
      border: 1px solid rgba(56, 189, 248, 0.22);
      background: #060b14;
      color: #f1f5f9;
      outline: none;
    }
    input[type="password"]:focus { border-color: #38bdf8; }
    button {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 0.9375rem;
      font-weight: 600;
      border-radius: 0.75rem;
      border: none;
      background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
      color: #ffffff;
      cursor: pointer;
    }
    button:hover { opacity: 0.95; }
    .error {
      background: rgba(239, 68, 68, 0.14);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
      font-size: 0.8125rem;
      padding: 0.625rem 0.75rem;
      border-radius: 0.75rem;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <main class="card">
    ${body}
  </main>
</body>
</html>`;
}

export function renderPinPage(params: { slug: string; qrName?: string; error?: string }): string {
  const safeSlug = escapeHtml(params.slug);
  const title = params.qrName ? `${params.qrName} — QR Protegido` : "Código QR Protegido";
  const errorBlock = params.error ? `<div class="error" role="alert">${escapeHtml(params.error)}</div>` : "";
  return pageShell(
    title,
    `<div class="badge" aria-hidden="true">&#128274;</div>
    <h1>Enlace Protegido</h1>
    <p>Ingresa el código PIN para continuar hacia <strong>${escapeHtml(params.qrName ?? params.slug)}</strong>.</p>
    ${errorBlock}
    <form method="POST" action="/q/${safeSlug}/unlock">
      <input
        type="password"
        name="pin"
        inputmode="numeric"
        pattern="[0-9]{4,8}"
        minlength="4"
        maxlength="8"
        placeholder="••••"
        autocomplete="one-time-code"
        required
        autofocus
      />
      <button type="submit">Desbloquear</button>
    </form>`,
  );
}

export function renderCampaignEndedPage(qrName?: string): string {
  return pageShell(
    "Campaña Finalizada",
    `<div class="badge" aria-hidden="true">&#8987;</div>
    <h1>Campaña Finalizada</h1>
    <p>${
      qrName
        ? `La campaña QR "${escapeHtml(qrName)}" ya no se encuentra activa.`
        : "Este código QR está pausado o ha expirado."
    }</p>`,
  );
}

export function renderNotFoundPage(slug?: string): string {
  return pageShell(
    "Código QR No Encontrado",
    `<div class="badge" aria-hidden="true">&#10067;</div>
    <h1>Código QR No Encontrado</h1>
    <p>${
      slug
        ? `No se encontró ningún código QR para "${escapeHtml(slug)}".`
        : "El código QR solicitado no existe."
    }</p>`,
  );
}
