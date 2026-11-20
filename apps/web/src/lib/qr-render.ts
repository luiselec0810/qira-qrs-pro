"use client";

import { normalizeQrStyle, type QrStyleConfig } from "@qira/shared";

/**
 * Shared qr-code-styling adapter used by the QR editor AND the Print Studio,
 * so a QR looks identical everywhere (RF-03.4: reactive QR on the canvas).
 * qr-code-styling touches `window`, so it is imported lazily (browser only).
 */
async function createInstance(style: Partial<QrStyleConfig>, data: string, sizePx: number, type: "canvas" | "svg") {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const s = normalizeQrStyle(style);
  return new QRCodeStyling({
    ...s,
    type,
    data,
    width: sizePx,
    height: sizePx,
    // Scale the quiet zone with the output size so previews and 300 DPI exports match.
    margin: Math.round((s.margin / s.width) * sizePx),
    image: s.image ?? undefined,
    qrOptions: { errorCorrectionLevel: s.errorCorrectionLevel },
  } as ConstructorParameters<typeof QRCodeStyling>[0]);
}

/** Renders a PNG Blob at an exact pixel size (use cmToPx(sizeCm) for 300 DPI). */
export async function renderQrPng(style: Partial<QrStyleConfig>, data: string, sizePx: number): Promise<Blob> {
  const qr = await createInstance(style, data, sizePx, "canvas");
  const raw = await qr.getRawData("png");
  if (!raw) throw new Error("QR rendering failed");
  return raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: "image/png" });
}

/** Renders an SVG string (vector; ideal for PDF/print or download). */
export async function renderQrSvg(style: Partial<QrStyleConfig>, data: string, sizePx: number): Promise<string> {
  const qr = await createInstance(style, data, sizePx, "svg");
  const raw = await qr.getRawData("svg");
  if (!raw) throw new Error("QR rendering failed");
  return raw instanceof Blob ? raw.text() : new TextDecoder().decode(raw as unknown as ArrayBuffer);
}

/** Loads the PNG render as an HTMLImageElement (for Konva.Image). */
export async function renderQrImage(style: Partial<QrStyleConfig>, data: string, sizePx: number): Promise<HTMLImageElement> {
  const blob = await renderQrPng(style, data, sizePx);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // The decoded bitmap stays usable after revoking the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Mounts a live preview into a DOM node; returns an updater. */
export async function mountQrPreview(container: HTMLElement, style: Partial<QrStyleConfig>, data: string, sizePx: number) {
  const qr = await createInstance(style, data, sizePx, "canvas");
  container.innerHTML = "";
  qr.append(container);
  return {
    update: (next: Partial<QrStyleConfig>, nextData = data) => {
      const s = normalizeQrStyle(next);
      qr.update({
        ...s,
        data: nextData,
        width: sizePx,
        height: sizePx,
        margin: Math.round((s.margin / s.width) * sizePx),
        image: s.image ?? undefined,
        qrOptions: { errorCorrectionLevel: s.errorCorrectionLevel },
      } as Parameters<typeof qr.update>[0]);
    },
  };
}
