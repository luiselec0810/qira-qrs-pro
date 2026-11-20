import { extractVariables } from "@qira/shared";

export type CanvasBackground =
  | { kind: "none" }
  | { kind: "solid"; color: string }
  | {
      kind: "gradient";
      type: "linear" | "radial";
      rotation: number;
      from: string;
      to: string;
    }
  | { kind: "image"; src: string };

export interface BaseLayer {
  id: string;
  name: string;
  /** Position in cm relative to the trim box top-left (0,0). */
  x: number;
  y: number;
  /** Size in cm. */
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
}

export interface TextLayer extends BaseLayer {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSizePt: number;
  fontStyle: "normal" | "bold" | "italic";
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
}

export interface ImageLayer extends BaseLayer {
  kind: "image";
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface QrLayer extends BaseLayer {
  kind: "qr";
  /** Square size in cm (width === height === sizeCm). */
  sizeCm: number;
}

export interface RectLayer extends BaseLayer {
  kind: "rect";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadiusCm: number;
}

export type CanvasLayer = TextLayer | ImageLayer | QrLayer | RectLayer;

export interface CanvasDoc {
  version: 1;
  background: CanvasBackground;
  layers: CanvasLayer[];
}

export const STUDIO_FONTS = [
  "Inter, system-ui, sans-serif",
  "Arial, Helvetica, sans-serif",
  "Georgia, serif",
  "'Times New Roman', Times, serif",
  "'Courier New', Courier, monospace",
  "Impact, sans-serif",
] as const;

export function makeLayerId(prefix = "lyr"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultCanvasDoc(
  widthCm: number,
  heightCm: number,
  hasQr = true,
): CanvasDoc {
  const layers: CanvasLayer[] = [];
  const qrSize = Math.round(Math.min(widthCm, heightCm) * 0.45 * 10) / 10;

  layers.push({
    id: makeLayerId("txt"),
    name: "Título",
    kind: "text",
    x: Math.round(widthCm * 0.1 * 100) / 100,
    y: Math.round(heightCm * 0.1 * 100) / 100,
    width: Math.round(widthCm * 0.8 * 100) / 100,
    height: Math.max(1.2, Math.round(heightCm * 0.18 * 100) / 100),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: "Escanea el menú",
    fontFamily: STUDIO_FONTS[0],
    fontSizePt: widthCm >= 10 ? 22 : 14,
    fontStyle: "bold",
    fill: "#111827",
    align: "center",
    lineHeight: 1.2,
    stroke: "#000000",
    strokeWidth: 0,
    shadowColor: "#000000",
    shadowBlur: 0,
  });

  if (hasQr) {
    layers.push({
      id: makeLayerId("qr"),
      name: "QR Dinámico",
      kind: "qr",
      x: Math.round(((widthCm - qrSize) / 2) * 100) / 100,
      y: Math.round((heightCm * 0.34) * 100) / 100,
      width: qrSize,
      height: qrSize,
      sizeCm: qrSize,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
    });
  }

  return {
    version: 1,
    background: { kind: "solid", color: "#ffffff" },
    layers,
  };
}

export function normalizeCanvasDoc(
  raw: unknown,
  widthCm: number,
  heightCm: number,
  hasQr = true,
): CanvasDoc {
  if (
    raw &&
    typeof raw === "object" &&
    "version" in raw &&
    (raw as { version: unknown }).version === 1 &&
    "layers" in raw &&
    Array.isArray((raw as { layers: unknown }).layers)
  ) {
    const candidate = raw as CanvasDoc;
    return {
      version: 1,
      background: candidate.background ?? { kind: "solid", color: "#ffffff" },
      layers: candidate.layers,
    };
  }
  return createDefaultCanvasDoc(widthCm, heightCm, hasQr);
}

/** Collects unique `{{variable}}` names across front and back text layers (RF-04.2). */
export function collectCanvasVariables(
  front: CanvasDoc | null | undefined,
  back?: CanvasDoc | null | undefined,
): string[] {
  const texts: string[] = [];
  for (const doc of [front, back]) {
    if (!doc) continue;
    for (const layer of doc.layers) {
      if (layer.kind === "text") {
        texts.push(layer.text);
      }
    }
  }
  return extractVariables(...texts);
}
