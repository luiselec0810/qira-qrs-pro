/**
 * Serializable subset of qr-code-styling options (RF-01.3), persisted in QrCode.styleConfig.
 * `data` is intentionally NOT stored: the payload is always the short URL {BASE_URL}/q/{slug}.
 *
 * Extended with the full visual gallery of body modules, corner frames, and corner centers.
 */
export type DotType =
  | "square"
  | "mosaic"
  | "dots"
  | "dots-small"
  | "rounded"
  | "extra-rounded"
  | "classy"
  | "classy-rounded"
  | "horizontal-lines"
  | "vertical-lines"
  | "diamond-special"
  | "Shuriken"
  | "star";

export type CornerSquareType =
  | "square"
  | "dot"
  | "extra-rounded"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "leaf-top-right"
  | "leaf-bottom-left"
  | "inpoint"
  | "outpoint"
  | "pinch";

export type CornerDotType =
  | "square"
  | "dot"
  | "rounded"
  | "classy"
  | "classy-rounded"
  | "leaf-top-right"
  | "leaf-bottom-left"
  | "inpoint"
  | "outpoint"
  | "vertical-bars"
  | "horizontal-bars"
  | "diamond"
  | "star"
  | "pinch";

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface GradientStop {
  offset: number;
  color: string;
}

export interface QrGradient {
  type: "linear" | "radial";
  rotation?: number;
  colorStops: GradientStop[];
}

export interface QrFill {
  color?: string;
  gradient?: QrGradient;
}

export interface QrStyleConfig {
  width: number;
  height: number;
  margin: number;
  errorCorrectionLevel: ErrorCorrectionLevel;
  dotsOptions: QrFill & { type: DotType };
  cornersSquareOptions: QrFill & { type: CornerSquareType };
  cornersDotOptions: QrFill & { type: CornerDotType };
  backgroundOptions: QrFill;
  /** URL of an uploaded logo (served by the API storage adapter). */
  image?: string | null;
  imageOptions: {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
    crossOrigin: "anonymous";
  };
}

export const TRANSPARENT = "rgba(0,0,0,0)";

export const DEFAULT_QR_STYLE: QrStyleConfig = {
  width: 1024,
  height: 1024,
  margin: 16,
  errorCorrectionLevel: "M",
  dotsOptions: { type: "square", color: "#111111" },
  cornersSquareOptions: { type: "square", color: "#111111" },
  cornersDotOptions: { type: "square", color: "#111111" },
  backgroundOptions: { color: "#ffffff" },
  image: null,
  imageOptions: { hideBackgroundDots: true, imageSize: 0.35, margin: 6, crossOrigin: "anonymous" },
};

/**
 * Enforces RF-01.3 invariants: a central logo forces error correction "H" (30%)
 * and hides the dots behind it.
 */
export function normalizeQrStyle(style: Partial<QrStyleConfig> | null | undefined): QrStyleConfig {
  const merged: QrStyleConfig = {
    ...DEFAULT_QR_STYLE,
    ...style,
    dotsOptions: { ...DEFAULT_QR_STYLE.dotsOptions, ...style?.dotsOptions },
    cornersSquareOptions: { ...DEFAULT_QR_STYLE.cornersSquareOptions, ...style?.cornersSquareOptions },
    cornersDotOptions: { ...DEFAULT_QR_STYLE.cornersDotOptions, ...style?.cornersDotOptions },
    backgroundOptions: { ...DEFAULT_QR_STYLE.backgroundOptions, ...style?.backgroundOptions },
    imageOptions: { ...DEFAULT_QR_STYLE.imageOptions, ...style?.imageOptions },
  };
  if (merged.image) {
    merged.errorCorrectionLevel = "H";
    merged.imageOptions.hideBackgroundDots = true;
  }
  return merged;
}

function fillColors(fill: QrFill): string[] {
  if (fill.gradient?.colorStops?.length) return fill.gradient.colorStops.map((s) => s.color);
  return fill.color ? [fill.color] : [];
}

/** Colors relevant to the contrast check (RF-01.4). */
export function qrForegroundColors(style: QrStyleConfig): string[] {
  return [
    ...fillColors(style.dotsOptions),
    ...fillColors(style.cornersSquareOptions),
    ...fillColors(style.cornersDotOptions),
  ];
}

export function qrBackgroundColors(style: QrStyleConfig): string[] {
  return fillColors(style.backgroundOptions);
}
