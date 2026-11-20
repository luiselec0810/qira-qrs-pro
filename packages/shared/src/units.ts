export const EXPORT_DPI = 300;
export const CM_PER_INCH = 2.54;
/** 1 cm = 72 / 2.54 pt = 28.3465 pt (RF-04.1) */
export const PT_PER_CM = 72 / CM_PER_INCH;
export const DEFAULT_BLEED_MM = 3;

/** RF-03.2: px = Math.round(cm / 2.54 * dpi) */
export function cmToPx(cm: number, dpi = EXPORT_DPI): number {
  return Math.round((cm / CM_PER_INCH) * dpi);
}

export function pxToCm(px: number, dpi = EXPORT_DPI): number {
  return (px / dpi) * CM_PER_INCH;
}

export function cmToPt(cm: number): number {
  return cm * PT_PER_CM;
}

export function mmToCm(mm: number): number {
  return mm / 10;
}

/** Effective DPI of an image of `pxWidth` printed at `cmWidth` (RNF-02 low-res warning). */
export function effectiveDpi(pxWidth: number, cmWidth: number): number {
  if (cmWidth <= 0) return 0;
  return pxWidth / (cmWidth / CM_PER_INCH);
}

export const LOW_RES_DPI_THRESHOLD = 240;

/**
 * pixelRatio for Konva's toDataURL so that a stage displayed at `stageWidthPx`
 * exports exactly cmToPx(widthCm) pixels wide (RNF-02).
 */
export function exportPixelRatio(stageWidthPx: number, widthCm: number, dpi = EXPORT_DPI): number {
  return cmToPx(widthCm, dpi) / stageWidthPx;
}

export interface CardPreset {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
}

export const CARD_PRESETS: readonly CardPreset[] = [
  { id: "hablador", label: "Hablador 10x15 cm", widthCm: 10, heightCm: 15 },
  { id: "sticker", label: "Sticker 5x5 cm", widthCm: 5, heightCm: 5 },
  { id: "tarjeta", label: "Tarjeta 9x5 cm", widthCm: 9, heightCm: 5 },
  { id: "flyer", label: "Flyer 14x21 cm", widthCm: 14, heightCm: 21 },
];

export interface PaperSize {
  id: "letter" | "a4" | "tabloid";
  label: string;
  widthCm: number;
  heightCm: number;
}

export const PAPER_SIZES: readonly PaperSize[] = [
  { id: "letter", label: "Carta 21.59x27.94 cm", widthCm: 21.59, heightCm: 27.94 },
  { id: "a4", label: "A4 21x29.7 cm", widthCm: 21, heightCm: 29.7 },
  { id: "tabloid", label: "Tabloide 27.94x43.18 cm", widthCm: 27.94, heightCm: 43.18 },
];
