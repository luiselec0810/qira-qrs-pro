import { DEFAULT_BLEED_MM, mmToCm } from "./units";

export interface ImpositionInput {
  sheetWidthCm: number;
  sheetHeightCm: number;
  /** Final (trim) card size. */
  cardWidthCm: number;
  cardHeightCm: number;
  bleedMm?: number;
  /** Separation between neighbouring cells (bleed boxes), in mm. */
  gapMm?: number;
  /** Unprintable/safety margin on each sheet edge, in mm. Must leave room for cut marks. */
  marginMm?: number;
  /** Cut mark length, in mm (RF-04.3 default 4 mm). */
  markLengthMm?: number;
  /** Allow rotating cards 90° if it fits more per sheet. */
  allowRotation?: boolean;
}

export interface Placement {
  /** Top-left of the bleed box, cm from sheet top-left. */
  x: number;
  y: number;
  /** Top-left of the trim box, cm from sheet top-left. */
  trimX: number;
  trimY: number;
  rotated: boolean;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ImpositionLayout {
  cols: number;
  rows: number;
  perSheet: number;
  rotated: boolean;
  /** Size of one cell (card + bleed on each side) as placed on the sheet (after rotation). */
  cellWidthCm: number;
  cellHeightCm: number;
  trimWidthCm: number;
  trimHeightCm: number;
  bleedCm: number;
  placements: Placement[];
  /** Guillotine cut marks in cm, origin at sheet top-left (y grows downward). */
  cutMarks: Segment[];
}

function fit(available: number, cell: number, gap: number): number {
  if (cell <= 0 || available < cell) return 0;
  return Math.floor((available + gap) / (cell + gap));
}

/**
 * RF-04.3: computes how many cards fit on a sheet in a grid, centres the grid and
 * generates 4 mm guillotine marks at each trim corner, pointing outwards and starting
 * just outside the bleed so they never print on the card itself.
 */
export function computeImposition(input: ImpositionInput): ImpositionLayout {
  const bleed = mmToCm(input.bleedMm ?? DEFAULT_BLEED_MM);
  const gap = mmToCm(input.gapMm ?? 4);
  const margin = mmToCm(input.marginMm ?? 10);
  const markLen = mmToCm(input.markLengthMm ?? 4);
  const markOffset = bleed + mmToCm(1);

  const availW = input.sheetWidthCm - 2 * margin;
  const availH = input.sheetHeightCm - 2 * margin;

  const evaluate = (rotated: boolean) => {
    const trimW = rotated ? input.cardHeightCm : input.cardWidthCm;
    const trimH = rotated ? input.cardWidthCm : input.cardHeightCm;
    const cellW = trimW + 2 * bleed;
    const cellH = trimH + 2 * bleed;
    const cols = fit(availW, cellW, gap);
    const rows = fit(availH, cellH, gap);
    return { rotated, trimW, trimH, cellW, cellH, cols, rows, count: cols * rows };
  };

  const normal = evaluate(false);
  const rotated = input.allowRotation ? evaluate(true) : normal;
  const best = rotated.count > normal.count ? rotated : normal;

  const gridW = best.cols * best.cellW + Math.max(0, best.cols - 1) * gap;
  const gridH = best.rows * best.cellH + Math.max(0, best.rows - 1) * gap;
  const originX = (input.sheetWidthCm - gridW) / 2;
  const originY = (input.sheetHeightCm - gridH) / 2;

  const placements: Placement[] = [];
  const cutMarks: Segment[] = [];

  for (let r = 0; r < best.rows; r++) {
    for (let c = 0; c < best.cols; c++) {
      const x = originX + c * (best.cellW + gap);
      const y = originY + r * (best.cellH + gap);
      const trimX = x + bleed;
      const trimY = y + bleed;
      placements.push({ x, y, trimX, trimY, rotated: best.rotated });

      const corners: Array<[number, number, -1 | 1, -1 | 1]> = [
        [trimX, trimY, -1, -1],
        [trimX + best.trimW, trimY, 1, -1],
        [trimX, trimY + best.trimH, -1, 1],
        [trimX + best.trimW, trimY + best.trimH, 1, 1],
      ];
      for (const [cx, cy, dx, dy] of corners) {
        // Horizontal mark (aligned with the horizontal trim line)
        cutMarks.push({ x1: cx + dx * markOffset, y1: cy, x2: cx + dx * (markOffset + markLen), y2: cy });
        // Vertical mark (aligned with the vertical trim line)
        cutMarks.push({ x1: cx, y1: cy + dy * markOffset, x2: cx, y2: cy + dy * (markOffset + markLen) });
      }
    }
  }

  return {
    cols: best.cols,
    rows: best.rows,
    perSheet: best.count,
    rotated: best.rotated,
    cellWidthCm: best.cellW,
    cellHeightCm: best.cellH,
    trimWidthCm: best.trimW,
    trimHeightCm: best.trimH,
    bleedCm: bleed,
    placements,
    cutMarks,
  };
}

/** Number of sheets needed for `total` cards. */
export function sheetsNeeded(total: number, perSheet: number): number {
  return perSheet > 0 ? Math.ceil(total / perSheet) : 0;
}
