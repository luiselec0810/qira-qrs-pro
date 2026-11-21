"use client";

import * as React from "react";
import type { CornerDotType, CornerSquareType, DotType } from "@qira/shared";
import {
  buildCustomCornerDotPath,
  buildCustomCornerSquarePath,
  buildCustomDotPath,
  roundedRectPath,
} from "@/lib/qr-render";

/**
 * Sample 6x6 QR body pattern matching the visual rhythm of the reference image
 * (isolated dots, vertical/horizontal runs, and L-corners).
 */
const PREVIEW_GRID = [
  [1, 0, 1, 1, 0, 1],
  [1, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 1, 1],
  [1, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 1],
  [0, 1, 1, 1, 0, 0],
];

function buildNativePreviewCell(
  type: DotType,
  x: number,
  y: number,
  s: number,
  getNeighbor: (dx: number, dy: number) => boolean,
): string {
  const left = getNeighbor(-1, 0);
  const right = getNeighbor(1, 0);
  const top = getNeighbor(0, -1);
  const bottom = getNeighbor(0, 1);

  if (type === "square") {
    return roundedRectPath(x, y, s, s, 0, 0, 0, 0);
  }
  if (type === "dots") {
    const r = s * 0.46;
    const cx = x + s / 2;
    const cy = y + s / 2;
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  }
  if (type === "rounded") {
    const r = s * 0.36;
    return roundedRectPath(
      x,
      y,
      s,
      s,
      !top && !left ? r : 0,
      !top && !right ? r : 0,
      !bottom && !right ? r : 0,
      !bottom && !left ? r : 0,
    );
  }
  if (type === "extra-rounded") {
    const r = s * 0.5;
    return roundedRectPath(
      x,
      y,
      s,
      s,
      !top && !left ? r : 0,
      !top && !right ? r : 0,
      !bottom && !right ? r : 0,
      !bottom && !left ? r : 0,
    );
  }
  if (type === "classy") {
    const r = s * 0.45;
    return roundedRectPath(x, y, s, s, !top && !left ? r : 0, 0, !bottom && !right ? r : 0, 0);
  }
  if (type === "classy-rounded") {
    const r = s * 0.5;
    return roundedRectPath(x, y, s, s, 0, !top && !right ? r : 0, 0, !bottom && !left ? r : 0);
  }
  return buildCustomDotPath(type, x, y, s, getNeighbor);
}

export function DotShapeGlyph({ type }: { type: DotType }) {
  const d = React.useMemo(() => {
    const N = PREVIEW_GRID.length;
    const cell = 7;
    const pad = 3;
    const parts: string[] = [];
    const has = (r: number, c: number) => Boolean(PREVIEW_GRID[r]?.[c]);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!has(r, c)) continue;
        parts.push(
          buildNativePreviewCell(
            type,
            pad + c * cell,
            pad + r * cell,
            cell,
            (dx, dy) => has(r + dy, c + dx),
          ),
        );
      }
    }
    return parts.join(" ");
  }, [type]);

  return (
    <svg viewBox="0 0 48 48" className="size-11 text-[#111111]" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

export function CornerSquareGlyph({ type }: { type: CornerSquareType }) {
  const d = React.useMemo(() => buildCustomCornerSquarePath(type, 6, 6, 36), [type]);
  return (
    <svg viewBox="0 0 48 48" className="size-11 text-[#111111]" aria-hidden="true">
      <path d={d} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

export function CornerDotGlyph({ type }: { type: CornerDotType }) {
  const d = React.useMemo(() => buildCustomCornerDotPath(type, 9, 9, 30), [type]);
  return (
    <svg viewBox="0 0 48 48" className="size-11 text-[#111111]" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
