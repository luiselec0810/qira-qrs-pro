"use client";

import {
  applyTemplate,
  cmToPx,
  DEFAULT_BLEED_MM,
  effectiveDpi,
  LOW_RES_DPI_THRESHOLD,
  mmToCm,
  PT_PER_CM,
  type QrStyleConfig,
} from "@qira/shared";
import { renderQrImage } from "@/lib/qr-render";
import type { CanvasDoc } from "@/components/studio/types";

export interface LowResImageWarning {
  layerId: string;
  name: string;
  dpi: number;
  widthCm: number;
  naturalWidth: number;
}

/** RNF-02: Checks all visible image layers for effective DPI < 240. */
export function findLowResImages(doc: CanvasDoc | null | undefined): LowResImageWarning[] {
  if (!doc) return [];
  const warnings: LowResImageWarning[] = [];
  for (const layer of doc.layers) {
    if (!layer.visible || layer.kind !== "image") continue;
    if (layer.naturalWidth > 0 && layer.width > 0) {
      const dpi = Math.round(effectiveDpi(layer.naturalWidth, layer.width));
      if (dpi < LOW_RES_DPI_THRESHOLD) {
        warnings.push({
          layerId: layer.id,
          name: layer.name,
          dpi,
          widthCm: layer.width,
          naturalWidth: layer.naturalWidth,
        });
      }
    }
  }
  return warnings;
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export interface RenderCardOptions {
  doc: CanvasDoc;
  widthCm: number;
  heightCm: number;
  bleedMm?: number;
  includeBleed?: boolean;
  format?: "png" | "jpeg";
  quality?: number;
  qr?: { shortUrl: string; styleConfig: Partial<QrStyleConfig> } | null;
  variables?: Record<string, string | undefined>;
}

/**
 * Headless 300 DPI Konva renderer (RF-03.2, RF-04.1, RNF-02).
 * Builds an off-screen Konva.Stage at exact 300 DPI pixel dimensions,
 * renders background + layers (with template substitution and 300 DPI QR),
 * exports a Blob, and destroys the stage.
 */
export async function renderCardToBlob(opts: RenderCardOptions): Promise<Blob> {
  const { default: Konva } = await import("konva");
  const format = opts.format ?? "png";
  const quality = opts.quality ?? 0.95;
  const includeBleed = opts.includeBleed ?? false;
  const bleedCm = includeBleed ? mmToCm(opts.bleedMm ?? DEFAULT_BLEED_MM) : 0;

  const totalWidthCm = opts.widthCm + 2 * bleedCm;
  const totalHeightCm = opts.heightCm + 2 * bleedCm;
  const pxW = cmToPx(totalWidthCm);
  const pxH = cmToPx(totalHeightCm);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "-99999px";
  container.style.width = `${pxW}px`;
  container.style.height = `${pxH}px`;
  document.body.appendChild(container);

  const stage = new Konva.Stage({
    container,
    width: pxW,
    height: pxH,
  });

  try {
    const mainLayer = new Konva.Layer();
    stage.add(mainLayer);

    // JPEG has no alpha channel: always paint a solid white base first (RF-04.1).
    if (format === "jpeg") {
      mainLayer.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: pxW,
          height: pxH,
          fill: "#ffffff",
        }),
      );
    }

    const bg = opts.doc.background;
    if (bg.kind === "solid") {
      mainLayer.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: pxW,
          height: pxH,
          fill: bg.color,
        }),
      );
    } else if (bg.kind === "gradient") {
      if (bg.type === "radial") {
        const radius = Math.max(pxW, pxH) / 2;
        mainLayer.add(
          new Konva.Rect({
            x: 0,
            y: 0,
            width: pxW,
            height: pxH,
            fillRadialGradientStartPoint: { x: pxW / 2, y: pxH / 2 },
            fillRadialGradientEndPoint: { x: pxW / 2, y: pxH / 2 },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndRadius: radius,
            fillRadialGradientColorStops: [0, bg.from, 1, bg.to],
          }),
        );
      } else {
        const rad = ((bg.rotation ?? 0) * Math.PI) / 180;
        const cx = pxW / 2;
        const cy = pxH / 2;
        const dx = (Math.cos(rad) * pxW) / 2;
        const dy = (Math.sin(rad) * pxH) / 2;
        mainLayer.add(
          new Konva.Rect({
            x: 0,
            y: 0,
            width: pxW,
            height: pxH,
            fillLinearGradientStartPoint: { x: cx - dx, y: cy - dy },
            fillLinearGradientEndPoint: { x: cx + dx, y: cy + dy },
            fillLinearGradientColorStops: [0, bg.from, 1, bg.to],
          }),
        );
      }
    } else if (bg.kind === "image" && bg.src) {
      try {
        const bgImg = await loadHtmlImage(bg.src);
        const scale = Math.max(pxW / (bgImg.naturalWidth || pxW), pxH / (bgImg.naturalHeight || pxH));
        const drawW = (bgImg.naturalWidth || pxW) * scale;
        const drawH = (bgImg.naturalHeight || pxH) * scale;
        mainLayer.add(
          new Konva.Image({
            image: bgImg,
            x: (pxW - drawW) / 2,
            y: (pxH - drawH) / 2,
            width: drawW,
            height: drawH,
          }),
        );
      } catch {
        // Ignore broken background image during export so export still completes.
      }
    }

    // Render visible layers in z-order.
    for (const layer of opts.doc.layers) {
      if (!layer.visible) continue;
      const x = cmToPx(layer.x + bleedCm);
      const y = cmToPx(layer.y + bleedCm);
      const w = cmToPx(layer.width);
      const h = cmToPx(layer.height);

      if (layer.kind === "rect") {
        const strokePx = layer.strokeWidth > 0 ? cmToPx(layer.strokeWidth / PT_PER_CM) : 0;
        mainLayer.add(
          new Konva.Rect({
            x,
            y,
            width: w,
            height: h,
            rotation: layer.rotation,
            opacity: layer.opacity,
            fill: layer.fill,
            stroke: strokePx > 0 ? layer.stroke : undefined,
            strokeWidth: strokePx,
            cornerRadius: cmToPx(layer.cornerRadiusCm),
          }),
        );
      } else if (layer.kind === "text") {
        const content = opts.variables
          ? applyTemplate(layer.text, opts.variables, { keepMissing: false })
          : layer.text;
        const fontSizePx = cmToPx(layer.fontSizePt / PT_PER_CM);
        const strokePx = layer.strokeWidth > 0 ? cmToPx(layer.strokeWidth / PT_PER_CM) : 0;
        const shadowBlurPx = layer.shadowBlur > 0 ? cmToPx(layer.shadowBlur / PT_PER_CM) : 0;

        mainLayer.add(
          new Konva.Text({
            x,
            y,
            width: w,
            height: h,
            rotation: layer.rotation,
            opacity: layer.opacity,
            text: content,
            fontFamily: layer.fontFamily,
            fontSize: fontSizePx,
            fontStyle: layer.fontStyle,
            fill: layer.fill,
            align: layer.align,
            lineHeight: layer.lineHeight,
            stroke: strokePx > 0 ? layer.stroke : undefined,
            strokeWidth: strokePx,
            shadowColor: shadowBlurPx > 0 ? layer.shadowColor : undefined,
            shadowBlur: shadowBlurPx,
          }),
        );
      } else if (layer.kind === "image") {
        try {
          const img = await loadHtmlImage(layer.src);
          mainLayer.add(
            new Konva.Image({
              image: img,
              x,
              y,
              width: w,
              height: h,
              rotation: layer.rotation,
              opacity: layer.opacity,
            }),
          );
        } catch {
          // Skip broken image layer.
        }
      } else if (layer.kind === "qr" && opts.qr) {
        const qrPx = Math.max(64, cmToPx(layer.width));
        const qrImg = await renderQrImage(opts.qr.styleConfig, opts.qr.shortUrl, qrPx);
        mainLayer.add(
          new Konva.Image({
            image: qrImg,
            x,
            y,
            width: qrPx,
            height: qrPx,
            rotation: layer.rotation,
            opacity: layer.opacity,
          }),
        );
      }
    }

    mainLayer.draw();
    const canvas = stage.toCanvas({ pixelRatio: 1 });
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas export returned null blob"))),
        mime,
        format === "jpeg" ? quality : undefined,
      );
    });
    return blob;
  } finally {
    stage.destroy();
    container.remove();
  }
}

export async function renderCardPngBytes(opts: Omit<RenderCardOptions, "format">): Promise<Uint8Array> {
  const blob = await renderCardToBlob({ ...opts, format: "png" });
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
