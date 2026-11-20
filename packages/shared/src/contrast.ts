export const MIN_CONTRAST_RATIO = 3.5;

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses #rgb, #rrggbb, #rrggbbaa, rgb() and rgba(). Returns null when unparseable. */
export function parseColor(input: string): Rgba | null {
  const s = input.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (fn) {
    const alphaRaw = fn[4];
    const a = alphaRaw === undefined ? 1 : alphaRaw.endsWith("%") ? Number.parseFloat(alphaRaw) / 100 : Number(alphaRaw);
    return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a };
  }
  return null;
}

/** Alpha-composites `fg` over an opaque `bg`. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(c: Rgba): number {
  const lin = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastReport {
  ratio: number;
  ok: boolean;
  /** True when the background is (partially) transparent and was assumed to sit on `assumedSurface`. */
  assumedSurface: boolean;
}

/**
 * RF-01.4: worst-case contrast between any foreground color (gradient stops included)
 * and any background color. Transparent backgrounds are evaluated over `surface`
 * (white paper by default) because that is what the scanner will actually see.
 */
export function checkQrContrast(
  foregroundColors: string[],
  backgroundColors: string[],
  surface = "#ffffff",
): ContrastReport {
  const surfaceRgba = parseColor(surface) ?? { r: 255, g: 255, b: 255, a: 1 };
  const bgs = backgroundColors.map(parseColor).filter((c): c is Rgba => c !== null);
  const fgs = foregroundColors.map(parseColor).filter((c): c is Rgba => c !== null);
  if (fgs.length === 0) return { ratio: 1, ok: false, assumedSurface: false };

  const assumedSurface = bgs.length === 0 || bgs.some((c) => c.a < 1);
  const opaqueBgs = (bgs.length ? bgs : [surfaceRgba]).map((c) => composite(c, surfaceRgba));

  let worst = Number.POSITIVE_INFINITY;
  for (const bg of opaqueBgs) {
    for (const fg of fgs) worst = Math.min(worst, contrastRatio(composite(fg, bg), bg));
  }
  const ratio = Math.round(worst * 100) / 100;
  return { ratio, ok: ratio >= MIN_CONTRAST_RATIO, assumedSurface };
}
