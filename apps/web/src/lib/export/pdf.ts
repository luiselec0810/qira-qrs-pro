"use client";

import { PDFDocument } from "pdf-lib";
import { cmToPt, DEFAULT_BLEED_MM, mmToCm, type QrStyleConfig } from "@qira/shared";
import type { CanvasDoc } from "@/components/studio/types";
import { renderCardPngBytes } from "./render";

export interface SingleCardPdfOptions {
  frontDoc: CanvasDoc;
  backDoc?: CanvasDoc | null;
  isDoubleSided?: boolean;
  widthCm: number;
  heightCm: number;
  bleedMm?: number;
  includeBleed?: boolean;
  qr?: { shortUrl: string; styleConfig: Partial<QrStyleConfig> } | null;
  variables?: Record<string, string | undefined>;
}

/**
 * RF-04.1: Creates a Print-Ready PDF with exact physical dimensions in points (1 cm = 28.3465 pt),
 * 1 page (front) or 2 pages (front + back), embedding 300 DPI PNG renders and setting TrimBox & BleedBox.
 */
export async function exportSingleCardPdf(opts: SingleCardPdfOptions): Promise<Blob> {
  const includeBleed = opts.includeBleed ?? true;
  const bleedCm = includeBleed ? mmToCm(opts.bleedMm ?? DEFAULT_BLEED_MM) : 0;
  const totalWidthCm = opts.widthCm + 2 * bleedCm;
  const totalHeightCm = opts.heightCm + 2 * bleedCm;

  const pageW = cmToPt(totalWidthCm);
  const pageH = cmToPt(totalHeightCm);
  const bleedPt = cmToPt(bleedCm);
  const trimW = cmToPt(opts.widthCm);
  const trimH = cmToPt(opts.heightCm);

  const pdf = await PDFDocument.create();

  const frontBytes = await renderCardPngBytes({
    doc: opts.frontDoc,
    widthCm: opts.widthCm,
    heightCm: opts.heightCm,
    bleedMm: opts.bleedMm,
    includeBleed,
    qr: opts.qr,
    variables: opts.variables,
  });

  const frontImg = await pdf.embedPng(frontBytes);
  const frontPage = pdf.addPage([pageW, pageH]);
  frontPage.drawImage(frontImg, { x: 0, y: 0, width: pageW, height: pageH });
  if (includeBleed && bleedCm > 0) {
    frontPage.setBleedBox(0, 0, pageW, pageH);
    frontPage.setTrimBox(bleedPt, bleedPt, trimW, trimH);
  }

  if (opts.isDoubleSided && opts.backDoc) {
    const backBytes = await renderCardPngBytes({
      doc: opts.backDoc,
      widthCm: opts.widthCm,
      heightCm: opts.heightCm,
      bleedMm: opts.bleedMm,
      includeBleed,
      qr: opts.qr,
      variables: opts.variables,
    });
    const backImg = await pdf.embedPng(backBytes);
    const backPage = pdf.addPage([pageW, pageH]);
    backPage.drawImage(backImg, { x: 0, y: 0, width: pageW, height: pageH });
    if (includeBleed && bleedCm > 0) {
      backPage.setBleedBox(0, 0, pageW, pageH);
      backPage.setTrimBox(bleedPt, bleedPt, trimW, trimH);
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

export interface BatchCardRenderItem {
  frontPng: Uint8Array;
  backPng?: Uint8Array | null;
}

/**
 * RF-04.2: Combines N pre-rendered cards (300 DPI PNG buffers) into a single multi-page PDF
 * with exact physical dimensions in points and TrimBox / BleedBox metadata.
 */
export async function exportBatchMultiPagePdf(opts: {
  items: BatchCardRenderItem[];
  widthCm: number;
  heightCm: number;
  bleedMm?: number;
  includeBleed?: boolean;
  isDoubleSided?: boolean;
}): Promise<Blob> {
  const includeBleed = opts.includeBleed ?? true;
  const bleedCm = includeBleed ? mmToCm(opts.bleedMm ?? DEFAULT_BLEED_MM) : 0;
  const totalWidthCm = opts.widthCm + 2 * bleedCm;
  const totalHeightCm = opts.heightCm + 2 * bleedCm;

  const pageW = cmToPt(totalWidthCm);
  const pageH = cmToPt(totalHeightCm);
  const bleedPt = cmToPt(bleedCm);
  const trimW = cmToPt(opts.widthCm);
  const trimH = cmToPt(opts.heightCm);

  const pdf = await PDFDocument.create();

  for (const item of opts.items) {
    const frontImg = await pdf.embedPng(item.frontPng);
    const frontPage = pdf.addPage([pageW, pageH]);
    frontPage.drawImage(frontImg, { x: 0, y: 0, width: pageW, height: pageH });
    if (includeBleed && bleedCm > 0) {
      frontPage.setBleedBox(0, 0, pageW, pageH);
      frontPage.setTrimBox(bleedPt, bleedPt, trimW, trimH);
    }

    if (opts.isDoubleSided && item.backPng) {
      const backImg = await pdf.embedPng(item.backPng);
      const backPage = pdf.addPage([pageW, pageH]);
      backPage.drawImage(backImg, { x: 0, y: 0, width: pageW, height: pageH });
      if (includeBleed && bleedCm > 0) {
        backPage.setBleedBox(0, 0, pageW, pageH);
        backPage.setTrimBox(bleedPt, bleedPt, trimW, trimH);
      }
    }
  }

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}
