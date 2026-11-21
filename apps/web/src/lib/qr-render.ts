"use client";

import {
  normalizeQrStyle,
  type CornerDotType,
  type CornerSquareType,
  type DotType,
  type QrStyleConfig,
} from "@qira/shared";

const SVG_NS = "http://www.w3.org/2000/svg";

const FINDER_OUTER = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const FINDER_INNER = [
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
];

const ERROR_CORRECTION_PERCENTS: Record<string, number> = {
  L: 0.07,
  M: 0.15,
  Q: 0.25,
  H: 0.3,
};

type NeighborFn = (dx: number, dy: number) => boolean;

/** Rounded rectangle path helper with independent corner radii (TL, TR, BR, BL). */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rTL: number,
  rTR: number,
  rBR: number,
  rBL: number,
): string {
  const maxR = Math.min(w, h) / 2;
  const tl = Math.min(maxR, Math.max(0, rTL));
  const tr = Math.min(maxR, Math.max(0, rTR));
  const br = Math.min(maxR, Math.max(0, rBR));
  const bl = Math.min(maxR, Math.max(0, rBL));

  return [
    `M ${x + tl} ${y}`,
    `H ${x + w - tr}`,
    tr > 0 ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
    `V ${y + h - br}`,
    br > 0 ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : `L ${x + w} ${y + h}`,
    `H ${x + bl}`,
    bl > 0 ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
    `V ${y + tl}`,
    tl > 0 ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : `L ${x} ${y}`,
    "Z",
  ].join(" ");
}

/** Builds an SVG path `d` for one custom body dot cell at `(x, y)` of size `s`. */
export function buildCustomDotPath(
  type: DotType,
  x: number,
  y: number,
  s: number,
  getNeighbor: NeighborFn,
): string {
  const left = getNeighbor(-1, 0);
  const right = getNeighbor(1, 0);
  const top = getNeighbor(0, -1);
  const bottom = getNeighbor(0, 1);

  switch (type) {
    case "mosaic": {
      const m = s * 0.09;
      return roundedRectPath(x + m, y + m, s - 2 * m, s - 2 * m, 0, 0, 0, 0);
    }
    case "dots-small": {
      const r = s * 0.34;
      const cx = x + s / 2;
      const cy = y + s / 2;
      return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
    }
    case "horizontal-lines": {
      const padY = s * 0.14;
      const h = s - 2 * padY;
      const r = h / 2;
      return roundedRectPath(
        x,
        y + padY,
        s,
        h,
        left ? 0 : r,
        right ? 0 : r,
        right ? 0 : r,
        left ? 0 : r,
      );
    }
    case "vertical-lines": {
      const padX = s * 0.14;
      const w = s - 2 * padX;
      const r = w / 2;
      return roundedRectPath(
        x + padX,
        y,
        w,
        s,
        top ? 0 : r,
        top ? 0 : r,
        bottom ? 0 : r,
        bottom ? 0 : r,
      );
    }
    case "diamond-special": {
      const count = +left + +right + +top + +bottom;
      if (count === 0) {
        const cx = x + s / 2;
        const cy = y + s / 2;
        const r = s * 0.48;
        return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;
      }
      const c = s * 0.42;
      return roundedRectPath(
        x,
        y,
        s,
        s,
        !top && !left ? c : 0,
        !top && !right ? c : 0,
        !bottom && !right ? c : 0,
        !bottom && !left ? c : 0,
      );
    }
    case "Shuriken": {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const k = s * 0.24;
      return [
        `M ${x} ${y}`,
        `Q ${cx} ${y + k} ${x + s} ${y}`,
        `Q ${x + s - k} ${cy} ${x + s} ${y + s}`,
        `Q ${cx} ${y + s - k} ${x} ${y + s}`,
        `Q ${x + k} ${cy} ${x} ${y}`,
        "Z",
      ].join(" ");
    }
    case "star": {
      const cx = x + s / 2;
      const cy = y + s / 2;
      const r = s * 0.5;
      return [
        `M ${cx} ${cy - r}`,
        `Q ${cx} ${cy} ${cx + r} ${cy}`,
        `Q ${cx} ${cy} ${cx} ${cy + r}`,
        `Q ${cx} ${cy} ${cx - r} ${cy}`,
        `Q ${cx} ${cy} ${cx} ${cy - r}`,
        "Z",
      ].join(" ");
    }
    default:
      return roundedRectPath(x, y, s, s, 0, 0, 0, 0);
  }
}

/**
 * Builds an even-odd SVG path `d` for a 7x7 outer corner frame at `(x, y)` of size `S`.
 * `rotationRad` is the corner orientation (`0` top-left, `PI/2` top-right, `-PI/2` bottom-left).
 */
export function buildCustomCornerSquarePath(
  type: CornerSquareType,
  x: number,
  y: number,
  S: number,
): string {
  const n = S / 7;
  const ix = x + n;
  const iy = y + n;
  const iS = S - 2 * n;

  const frameWithRadii = (rTL: number, rTR: number, rBR: number, rBL: number) => {
    const outer = roundedRectPath(x, y, S, S, rTL * n, rTR * n, rBR * n, rBL * n);
    const inner = roundedRectPath(
      ix,
      iy,
      iS,
      iS,
      Math.max(0, (rTL - 0.85) * n),
      Math.max(0, (rTR - 0.85) * n),
      Math.max(0, (rBR - 0.85) * n),
      Math.max(0, (rBL - 0.85) * n),
    );
    return `${outer} ${inner}`;
  };

  switch (type) {
    case "square":
      return frameWithRadii(0, 0, 0, 0);
    case "rounded":
      return frameWithRadii(1.4, 1.4, 1.4, 1.4);
    case "extra-rounded":
      return frameWithRadii(2.5, 2.5, 2.5, 2.5);
    case "dot":
      return frameWithRadii(3.5, 3.5, 3.5, 3.5);
    case "leaf-top-right":
      // Top-left & bottom-right rounded (leaf pointing top-right / bottom-left)
      return frameWithRadii(2.4, 0, 2.4, 0);
    case "leaf-bottom-left":
      // Top-right & bottom-left rounded
      return frameWithRadii(0, 2.4, 0, 2.4);
    case "inpoint":
      // 3 corners rounded, bottom-right sharp (points inward toward QR center)
      return frameWithRadii(2.3, 2.3, 0, 2.3);
    case "outpoint":
      // 3 corners rounded, top-left sharp (points outward to QR corner)
      return frameWithRadii(0, 2.3, 2.3, 2.3);
    case "classy":
      // Top-left rounded only
      return frameWithRadii(2.4, 0, 0, 0);
    case "classy-rounded": {
      // Decorative notched corner frame
      const c = 1.6 * n;
      const outer = [
        `M ${x + c} ${y}`,
        `H ${x + S - c}`,
        `Q ${x + S - c} ${y + c} ${x + S} ${y + c}`,
        `V ${y + S - c}`,
        `Q ${x + S - c} ${y + S - c} ${x + S - c} ${y + S}`,
        `H ${x + c}`,
        `Q ${x + c} ${y + S - c} ${x} ${y + S - c}`,
        `V ${y + c}`,
        `Q ${x + c} ${y + c} ${x + c} ${y}`,
        "Z",
      ].join(" ");
      const ic = 1.05 * n;
      const inner = roundedRectPath(ix, iy, iS, iS, ic, ic, ic, ic);
      return `${outer} ${inner}`;
    }
    case "pinch": {
      // Subtle cushion / trapezium frame
      const d = 0.28 * n;
      const outer = [
        `M ${x} ${y}`,
        `Q ${x + S / 2} ${y + d} ${x + S} ${y}`,
        `Q ${x + S - d} ${y + S / 2} ${x + S} ${y + S}`,
        `Q ${x + S / 2} ${y + S - d} ${x} ${y + S}`,
        `Q ${x + d} ${y + S / 2} ${x} ${y}`,
        "Z",
      ].join(" ");
      const inner = [
        `M ${ix} ${iy}`,
        `Q ${ix + iS / 2} ${iy + d * 0.7} ${ix + iS} ${iy}`,
        `Q ${ix + iS - d * 0.7} ${iy + iS / 2} ${ix + iS} ${iy + iS}`,
        `Q ${ix + iS / 2} ${iy + iS - d * 0.7} ${ix} ${iy + iS}`,
        `Q ${ix + d * 0.7} ${iy + iS / 2} ${ix} ${iy}`,
        "Z",
      ].join(" ");
      return `${outer} ${inner}`;
    }
    default:
      return frameWithRadii(0, 0, 0, 0);
  }
}

/** Builds an SVG path `d` for the 3x3 inner corner center at `(x, y)` of size `S`. */
export function buildCustomCornerDotPath(
  type: CornerDotType,
  x: number,
  y: number,
  S: number,
): string {
  const u = S / 3;
  switch (type) {
    case "square":
      return roundedRectPath(x, y, S, S, 0, 0, 0, 0);
    case "rounded":
      return roundedRectPath(x, y, S, S, 0.75 * u, 0.75 * u, 0.75 * u, 0.75 * u);
    case "dot":
      return roundedRectPath(x, y, S, S, 1.5 * u, 1.5 * u, 1.5 * u, 1.5 * u);
    case "leaf-top-right":
      return roundedRectPath(x, y, S, S, 1.35 * u, 0, 1.35 * u, 0);
    case "leaf-bottom-left":
      return roundedRectPath(x, y, S, S, 0, 1.35 * u, 0, 1.35 * u);
    case "inpoint":
      return roundedRectPath(x, y, S, S, 1.35 * u, 1.35 * u, 0, 1.35 * u);
    case "outpoint":
      return roundedRectPath(x, y, S, S, 0, 1.35 * u, 1.35 * u, 1.35 * u);
    case "classy":
      return roundedRectPath(x, y, S, S, 1.35 * u, 0, 0, 0);
    case "classy-rounded": {
      const c = 0.75 * u;
      return [
        `M ${x + c} ${y}`,
        `H ${x + S - c}`,
        `Q ${x + S - c} ${y + c} ${x + S} ${y + c}`,
        `V ${y + S - c}`,
        `Q ${x + S - c} ${y + S - c} ${x + S - c} ${y + S}`,
        `H ${x + c}`,
        `Q ${x + c} ${y + S - c} ${x} ${y + S - c}`,
        `V ${y + c}`,
        `Q ${x + c} ${y + c} ${x + c} ${y}`,
        "Z",
      ].join(" ");
    }
    case "vertical-bars": {
      const gap = S * 0.08;
      const barW = (S - 2 * gap) / 3;
      const r = barW / 2;
      return [0, 1, 2]
        .map((i) => roundedRectPath(x + i * (barW + gap), y, barW, S, r, r, r, r))
        .join(" ");
    }
    case "horizontal-bars": {
      const gap = S * 0.08;
      const barH = (S - 2 * gap) / 3;
      const r = barH / 2;
      return [0, 1, 2]
        .map((i) => roundedRectPath(x, y + i * (barH + gap), S, barH, r, r, r, r))
        .join(" ");
    }
    case "diamond": {
      // Chamfered / octagon-cut corner dot matching bottom row of reference
      const c = S * 0.34;
      return [
        `M ${x} ${y}`,
        `H ${x + S - c}`,
        `L ${x + S} ${y + c}`,
        `V ${y + S}`,
        `H ${x + c}`,
        `L ${x} ${y + S - c}`,
        "Z",
      ].join(" ");
    }
    case "star": {
      // 4-point concave pillow / star center matching bottom row of reference
      const cx = x + S / 2;
      const cy = y + S / 2;
      const k = S * 0.24;
      return [
        `M ${x} ${y}`,
        `Q ${cx} ${y + k} ${x + S} ${y}`,
        `Q ${x + S - k} ${cy} ${x + S} ${y + S}`,
        `Q ${cx} ${y + S - k} ${x} ${y + S}`,
        `Q ${x + k} ${cy} ${x} ${y}`,
        "Z",
      ].join(" ");
    }
    case "pinch": {
      const d = S * 0.08;
      return [
        `M ${x} ${y}`,
        `L ${x + S} ${y + d}`,
        `L ${x + S - d} ${y + S}`,
        `L ${x + d} ${y + S}`,
        "Z",
      ].join(" ");
    }
    default:
      return roundedRectPath(x, y, S, S, 0, 0, 0, 0);
  }
}

const NATIVE_DOT_TYPES = new Set<string>([
  "square",
  "dots",
  "rounded",
  "extra-rounded",
  "classy",
  "classy-rounded",
]);
const NATIVE_CORNER_SQUARE_TYPES = new Set<string>(["square", "dot", "extra-rounded"]);
const NATIVE_CORNER_DOT_TYPES = new Set<string>(["square", "dot"]);

function isFinderCell(row: number, col: number, count: number): boolean {
  const inOuter =
    Boolean(FINDER_OUTER[row]?.[col]) ||
    Boolean(FINDER_OUTER[row - count + 7]?.[col]) ||
    Boolean(FINDER_OUTER[row]?.[col - count + 7]);
  const inInner =
    Boolean(FINDER_INNER[row]?.[col]) ||
    Boolean(FINDER_INNER[row - count + 7]?.[col]) ||
    Boolean(FINDER_INNER[row]?.[col - count + 7]);
  return inOuter || inInner;
}

function computeHiddenLogoCells(
  imgEl: SVGElement | null,
  count: number,
  dotSize: number,
  style: QrStyleConfig,
): { hideXDots: number; hideYDots: number } {
  if (!style.image || !style.imageOptions.hideBackgroundDots || !imgEl) {
    return { hideXDots: 0, hideYDots: 0 };
  }
  const w = Number(imgEl.getAttribute("width") || 0);
  const h = Number(imgEl.getAttribute("height") || 0);
  if (w <= 0 || h <= 0 || dotSize <= 0) {
    const fallback = Math.max(1, Math.floor(count * style.imageOptions.imageSize));
    return { hideXDots: fallback, hideYDots: fallback };
  }
  const ecPercent = ERROR_CORRECTION_PERCENTS[style.errorCorrectionLevel] ?? 0.3;
  const maxHiddenDots = Math.floor(style.imageOptions.imageSize * ecPercent * count * count);
  const maxHiddenAxisDots = count - 14;
  const k = h / w;
  let hideX = Math.floor(Math.sqrt(maxHiddenDots / k));
  if (hideX <= 0) hideX = 1;
  if (maxHiddenAxisDots && maxHiddenAxisDots < hideX) hideX = maxHiddenAxisDots;
  if (hideX % 2 === 0) hideX--;
  let hideY = 1 + 2 * Math.ceil((hideX * k - 1) / 2);
  if (hideY * hideX > maxHiddenDots || (maxHiddenAxisDots && maxHiddenAxisDots < hideY)) {
    if (maxHiddenAxisDots && maxHiddenAxisDots < hideY) {
      hideY = maxHiddenAxisDots;
      if (hideY % 2 === 0) hideX--;
    } else {
      hideY -= 2;
    }
    hideX = 1 + 2 * Math.ceil((hideY / k - 1) / 2);
  }
  return { hideXDots: hideX, hideYDots: hideY };
}

/**
 * Post-processes the SVG clipPaths generated by qr-code-styling whenever any extended
 * shape (`DotType`, `CornerSquareType`, `CornerDotType`) is selected.
 * Because qr-code-styling applies colors and gradients through `<clipPath>`, replacing the
 * clipPath children preserves all solid colors, linear/radial gradients, and central logos!
 */
function applyExtendedShapesExtension(
  this: { _qr?: { getModuleCount(): number; isDark(row: number, col: number): boolean } },
  svg: SVGElement,
  style: QrStyleConfig,
  sizePx: number,
  marginPx: number,
) {
  const qr = this._qr;
  if (!qr) return;

  const customDot = !NATIVE_DOT_TYPES.has(style.dotsOptions.type);
  const customCornerSquare = !NATIVE_CORNER_SQUARE_TYPES.has(style.cornersSquareOptions.type);
  const customCornerDot = !NATIVE_CORNER_DOT_TYPES.has(style.cornersDotOptions.type);
  if (!customDot && !customCornerSquare && !customCornerDot) return;

  const count = qr.getModuleCount();
  const availableSize = sizePx - 2 * marginPx;
  const dotSize = availableSize / count;
  const startX = (sizePx - count * dotSize) / 2;
  const startY = (sizePx - count * dotSize) / 2;

  const imgEl = svg.querySelector("image");
  const { hideXDots, hideYDots } = computeHiddenLogoCells(imgEl, count, dotSize, style);

  const isVisibleCell = (row: number, col: number): boolean => {
    if (row < 0 || col < 0 || row >= count || col >= count) return false;
    if (
      style.image &&
      style.imageOptions.hideBackgroundDots &&
      row >= (count - hideYDots) / 2 &&
      row < (count + hideYDots) / 2 &&
      col >= (count - hideXDots) / 2 &&
      col < (count + hideXDots) / 2
    ) {
      return false;
    }
    if (isFinderCell(row, col, count)) return false;
    return qr.isDark(row, col);
  };

  // 1. Custom body dots
  if (customDot) {
    const dotsClip = svg.querySelector('clipPath[id^="clip-path-dot-color-"]');
    if (dotsClip) {
      dotsClip.innerHTML = "";
      const pathParts: string[] = [];
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (!isVisibleCell(row, col)) continue;
          const x = startX + col * dotSize;
          const y = startY + row * dotSize;
          pathParts.push(
            buildCustomDotPath(style.dotsOptions.type, x, y, dotSize, (dx, dy) =>
              isVisibleCell(row + dy, col + dx),
            ),
          );
        }
      }
      const pathEl = document.createElementNS(SVG_NS, "path");
      pathEl.setAttribute("d", pathParts.join(" "));
      dotsClip.appendChild(pathEl);
    }
  }

  // 2. Custom corner frames (7x7) and corner centers (3x3)
  const corners: Array<[number, number, number]> = [
    [0, 0, 0],
    [1, 0, 90],
    [0, 1, -90],
  ];

  for (const [colIdx, rowIdx, rotDeg] of corners) {
    const cornerX = startX + colIdx * dotSize * (count - 7);
    const cornerY = startY + rowIdx * dotSize * (count - 7);
    const outerSize = 7 * dotSize;
    const innerSize = 3 * dotSize;

    if (customCornerSquare) {
      const csClip = svg.querySelector(
        `clipPath[id^="clip-path-corners-square-color-${colIdx}-${rowIdx}-"]`,
      );
      if (csClip) {
        csClip.innerHTML = "";
        const pathEl = document.createElementNS(SVG_NS, "path");
        pathEl.setAttribute("clip-rule", "evenodd");
        pathEl.setAttribute("fill-rule", "evenodd");
        pathEl.setAttribute(
          "d",
          buildCustomCornerSquarePath(style.cornersSquareOptions.type, cornerX, cornerY, outerSize),
        );
        if (rotDeg !== 0) {
          const cx = cornerX + outerSize / 2;
          const cy = cornerY + outerSize / 2;
          pathEl.setAttribute("transform", `rotate(${rotDeg}, ${cx}, ${cy})`);
        }
        csClip.appendChild(pathEl);
      }
    }

    if (customCornerDot) {
      const cdClip = svg.querySelector(
        `clipPath[id^="clip-path-corners-dot-color-${colIdx}-${rowIdx}-"]`,
      );
      if (cdClip) {
        cdClip.innerHTML = "";
        const dotX = cornerX + 2 * dotSize;
        const dotY = cornerY + 2 * dotSize;
        const pathEl = document.createElementNS(SVG_NS, "path");
        pathEl.setAttribute(
          "d",
          buildCustomCornerDotPath(style.cornersDotOptions.type, dotX, dotY, innerSize),
        );
        if (rotDeg !== 0) {
          const cx = dotX + innerSize / 2;
          const cy = dotY + innerSize / 2;
          pathEl.setAttribute("transform", `rotate(${rotDeg}, ${cx}, ${cy})`);
        }
        cdClip.appendChild(pathEl);
      }
    }
  }
}

function toSafeCoreOptions(s: QrStyleConfig, data: string, sizePx: number, marginPx: number, type: "canvas" | "svg") {
  const safeDotType = NATIVE_DOT_TYPES.has(s.dotsOptions.type) ? s.dotsOptions.type : "square";
  const safeCornerSquareType = NATIVE_CORNER_SQUARE_TYPES.has(s.cornersSquareOptions.type)
    ? s.cornersSquareOptions.type
    : "square";
  const safeCornerDotType = NATIVE_CORNER_DOT_TYPES.has(s.cornersDotOptions.type)
    ? s.cornersDotOptions.type
    : "square";

  return {
    ...s,
    type,
    data,
    width: sizePx,
    height: sizePx,
    margin: marginPx,
    image: s.image ?? undefined,
    dotsOptions: {
      ...s.dotsOptions,
      type: safeDotType,
      color: s.dotsOptions.color ?? "#111111",
    },
    cornersSquareOptions: {
      ...s.cornersSquareOptions,
      type: safeCornerSquareType,
      color: s.cornersSquareOptions.color ?? s.dotsOptions.color ?? "#111111",
    },
    cornersDotOptions: {
      ...s.cornersDotOptions,
      type: safeCornerDotType,
      color: s.cornersDotOptions.color ?? s.dotsOptions.color ?? "#111111",
    },
    qrOptions: { errorCorrectionLevel: s.errorCorrectionLevel },
  };
}

/**
 * Shared qr-code-styling adapter used by the QR editor AND the Print Studio,
 * so a QR looks identical everywhere (RF-03.4: reactive QR on the canvas).
 */
async function createInstance(
  style: Partial<QrStyleConfig>,
  data: string,
  sizePx: number,
  type: "canvas" | "svg",
) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const s = normalizeQrStyle(style);
  const marginPx = Math.round((s.margin / s.width) * sizePx);
  const qr = new QRCodeStyling(
    toSafeCoreOptions(s, data, sizePx, marginPx, type) as ConstructorParameters<typeof QRCodeStyling>[0],
  );
  qr.applyExtension(function (this: unknown, svg: SVGElement) {
    applyExtendedShapesExtension.call(
      this as { _qr?: { getModuleCount(): number; isDark(row: number, col: number): boolean } },
      svg,
      s,
      sizePx,
      marginPx,
    );
  });
  return qr;
}

/** Renders a PNG Blob at an exact pixel size (use cmToPx(sizeCm) for 300 DPI). */
export async function renderQrPng(
  style: Partial<QrStyleConfig>,
  data: string,
  sizePx: number,
): Promise<Blob> {
  const qr = await createInstance(style, data, sizePx, "canvas");
  const raw = await qr.getRawData("png");
  if (!raw) throw new Error("QR rendering failed");
  return raw instanceof Blob ? raw : new Blob([raw as BlobPart], { type: "image/png" });
}

/** Renders an SVG string (vector; ideal for PDF/print or download). */
export async function renderQrSvg(
  style: Partial<QrStyleConfig>,
  data: string,
  sizePx: number,
): Promise<string> {
  const qr = await createInstance(style, data, sizePx, "svg");
  const raw = await qr.getRawData("svg");
  if (!raw) throw new Error("QR rendering failed");
  return raw instanceof Blob ? raw.text() : new TextDecoder().decode(raw as unknown as ArrayBuffer);
}

/** Loads the PNG render as an HTMLImageElement (for Konva.Image). */
export async function renderQrImage(
  style: Partial<QrStyleConfig>,
  data: string,
  sizePx: number,
): Promise<HTMLImageElement> {
  const blob = await renderQrPng(style, data, sizePx);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Mounts a live preview into a DOM node; returns an updater. */
export async function mountQrPreview(
  container: HTMLElement,
  style: Partial<QrStyleConfig>,
  data: string,
  sizePx: number,
) {
  const qr = await createInstance(style, data, sizePx, "canvas");
  container.innerHTML = "";
  qr.append(container);
  return {
    update: (next: Partial<QrStyleConfig>, nextData = data) => {
      const s = normalizeQrStyle(next);
      const marginPx = Math.round((s.margin / s.width) * sizePx);
      qr.applyExtension(function (this: unknown, svg: SVGElement) {
        applyExtendedShapesExtension.call(
          this as { _qr?: { getModuleCount(): number; isDark(row: number, col: number): boolean } },
          svg,
          s,
          sizePx,
          marginPx,
        );
      });
      qr.update(
        toSafeCoreOptions(s, nextData, sizePx, marginPx, "canvas") as Parameters<typeof qr.update>[0],
      );
    },
  };
}
