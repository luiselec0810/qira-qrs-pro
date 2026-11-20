"use client";

import { degrees, PDFDocument, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import {
  cmToPt,
  computeImposition,
  DEFAULT_BLEED_MM,
  type ImpositionLayout,
  type PaperSize,
} from "@qira/shared";

export interface ImposedCardBuffers {
  frontPng: Uint8Array;
  backPng?: Uint8Array | null;
}

export interface ExportImposedPdfOptions {
  paper: PaperSize;
  cardWidthCm: number;
  cardHeightCm: number;
  bleedMm?: number;
  gapMm?: number;
  marginMm?: number;
  allowRotation?: boolean;
  isDoubleSided?: boolean;
  /** Either replicate a single card `copies` times, or place an array of distinct batch cards. */
  single?: {
    copies: number;
    frontPng: Uint8Array;
    backPng?: Uint8Array | null;
  };
  items?: ImposedCardBuffers[];
}

function drawPlacedCard(
  page: PDFPage,
  image: PDFImage,
  sheetHeightCm: number,
  xCm: number,
  yCm: number,
  layout: ImpositionLayout,
  rotated: boolean,
) {
  if (!rotated) {
    page.drawImage(image, {
      x: cmToPt(xCm),
      y: cmToPt(sheetHeightCm - yCm - layout.cellHeightCm),
      width: cmToPt(layout.cellWidthCm),
      height: cmToPt(layout.cellHeightCm),
    });
  } else {
    // 90° CCW rotation around (x, y): image width goes along +Y, image height goes along -X.
    page.drawImage(image, {
      x: cmToPt(xCm + layout.cellWidthCm),
      y: cmToPt(sheetHeightCm - yCm - layout.cellHeightCm),
      width: cmToPt(layout.cellHeightCm),
      height: cmToPt(layout.cellWidthCm),
      rotate: degrees(90),
    });
  }
}

function drawCutMarks(
  page: PDFPage,
  sheetWidthCm: number,
  sheetHeightCm: number,
  layout: ImpositionLayout,
  mirrorHorizontally: boolean,
) {
  for (const seg of layout.cutMarks) {
    const x1 = mirrorHorizontally ? sheetWidthCm - seg.x1 : seg.x1;
    const x2 = mirrorHorizontally ? sheetWidthCm - seg.x2 : seg.x2;
    page.drawLine({
      start: { x: cmToPt(x1), y: cmToPt(sheetHeightCm - seg.y1) },
      end: { x: cmToPt(x2), y: cmToPt(sheetHeightCm - seg.y2) },
      thickness: 0.25,
      color: rgb(0, 0, 0),
    });
  }
}

/**
 * RF-04.3: Imposes cards onto Carta / A4 / Tabloide sheets with configurable gap,
 * margin, optional 90° auto-rotation, 4 mm vector guillotine cut marks (0.25 pt stroke),
 * and horizontal mirroring on the back sheet for double-sided long-edge registration.
 */
export async function exportImposedPdf(opts: ExportImposedPdfOptions): Promise<Blob> {
  const layout = computeImposition({
    sheetWidthCm: opts.paper.widthCm,
    sheetHeightCm: opts.paper.heightCm,
    cardWidthCm: opts.cardWidthCm,
    cardHeightCm: opts.cardHeightCm,
    bleedMm: opts.bleedMm ?? DEFAULT_BLEED_MM,
    gapMm: opts.gapMm ?? 4,
    marginMm: opts.marginMm ?? 10,
    markLengthMm: 4,
    allowRotation: opts.allowRotation ?? true,
  });

  if (layout.perSheet <= 0) {
    throw new Error("Card dimensions plus bleed and margins do not fit on the selected paper size.");
  }

  const pdf = await PDFDocument.create();
  const sheetW = cmToPt(opts.paper.widthCm);
  const sheetH = cmToPt(opts.paper.heightCm);

  if (opts.single) {
    const copies = Math.max(1, opts.single.copies);
    const frontEmbedded = await pdf.embedPng(opts.single.frontPng);
    const backEmbedded =
      opts.isDoubleSided && opts.single.backPng ? await pdf.embedPng(opts.single.backPng) : null;

    for (let offset = 0; offset < copies; offset += layout.perSheet) {
      const countOnSheet = Math.min(layout.perSheet, copies - offset);
      const frontPage = pdf.addPage([sheetW, sheetH]);

      for (let i = 0; i < countOnSheet; i++) {
        const p = layout.placements[i]!;
        drawPlacedCard(frontPage, frontEmbedded, opts.paper.heightCm, p.x, p.y, layout, p.rotated);
      }
      drawCutMarks(frontPage, opts.paper.widthCm, opts.paper.heightCm, layout, false);

      if (backEmbedded) {
        const backPage = pdf.addPage([sheetW, sheetH]);
        for (let i = 0; i < countOnSheet; i++) {
          const p = layout.placements[i]!;
          const mirroredX = opts.paper.widthCm - p.x - layout.cellWidthCm;
          drawPlacedCard(backPage, backEmbedded, opts.paper.heightCm, mirroredX, p.y, layout, p.rotated);
        }
        drawCutMarks(backPage, opts.paper.widthCm, opts.paper.heightCm, layout, true);
      }
    }
  } else if (opts.items && opts.items.length > 0) {
    const items = opts.items;
    const hasAnyBack = Boolean(opts.isDoubleSided && items.some((it) => it.backPng));

    for (let offset = 0; offset < items.length; offset += layout.perSheet) {
      const slice = items.slice(offset, offset + layout.perSheet);
      const frontPage = pdf.addPage([sheetW, sheetH]);

      const embeddedSlice = await Promise.all(
        slice.map(async (item) => ({
          front: await pdf.embedPng(item.frontPng),
          back: hasAnyBack && item.backPng ? await pdf.embedPng(item.backPng) : null,
        })),
      );

      for (let i = 0; i < embeddedSlice.length; i++) {
        const p = layout.placements[i]!;
        drawPlacedCard(
          frontPage,
          embeddedSlice[i]!.front,
          opts.paper.heightCm,
          p.x,
          p.y,
          layout,
          p.rotated,
        );
      }
      drawCutMarks(frontPage, opts.paper.widthCm, opts.paper.heightCm, layout, false);

      if (hasAnyBack) {
        const backPage = pdf.addPage([sheetW, sheetH]);
        for (let i = 0; i < embeddedSlice.length; i++) {
          const backImg = embeddedSlice[i]!.back;
          if (!backImg) continue;
          const p = layout.placements[i]!;
          const mirroredX = opts.paper.widthCm - p.x - layout.cellWidthCm;
          drawPlacedCard(backPage, backImg, opts.paper.heightCm, mirroredX, p.y, layout, p.rotated);
        }
        drawCutMarks(backPage, opts.paper.widthCm, opts.paper.heightCm, layout, true);
      }
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}
