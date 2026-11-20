"use client";

import * as React from "react";
import { AlertTriangle, Download, FileImage, FileText, Grid2x2 } from "lucide-react";
import {
  cmToPt,
  cmToPx,
  computeImposition,
  PAPER_SIZES,
  type PaperSize,
  type QrStyleConfig,
  sheetsNeeded,
} from "@qira/shared";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";
import { Dialog, DialogContent, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/interactive";
import type { CanvasDoc } from "./types";
import {
  downloadBlob,
  findLowResImages,
  renderCardPngBytes,
  renderCardToBlob,
} from "@/lib/export/render";
import { exportSingleCardPdf } from "@/lib/export/pdf";
import { exportImposedPdf } from "@/lib/export/impose";

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardName: string;
  widthCm: number;
  heightCm: number;
  bleedMm: number;
  isDoubleSided: boolean;
  frontDoc: CanvasDoc;
  backDoc: CanvasDoc | null;
  qr: { shortUrl: string; styleConfig: Partial<QrStyleConfig> } | null;
}

export function ExportDialog({
  open,
  onOpenChange,
  cardName,
  widthCm,
  heightCm,
  bleedMm,
  isDoubleSided,
  frontDoc,
  backDoc,
  qr,
}: ExportDialogProps) {
  const [tab, setTab] = React.useState<"raster" | "pdf" | "impose">("raster");
  const [includeBleed, setIncludeBleed] = React.useState(true);
  const [paperId, setPaperId] = React.useState<PaperSize["id"]>("letter");
  const [gapMm, setGapMm] = React.useState(4);
  const [marginMm, setMarginMm] = React.useState(10);
  const [copies, setCopies] = React.useState(12);
  const [allowRotation, setAllowRotation] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const safeSlug = React.useMemo(
    () =>
      (cardName || "card")
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/^-+|-+$/g, "") || "card",
    [cardName],
  );

  // RNF-02: detect any image layer below 240 DPI across front and back
  const lowResWarnings = React.useMemo(() => {
    const front = findLowResImages(frontDoc).map((w) => ({ ...w, side: "Frente" }));
    const back = isDoubleSided ? findLowResImages(backDoc).map((w) => ({ ...w, side: "Reverso" })) : [];
    return [...front, ...back];
  }, [frontDoc, backDoc, isDoubleSided]);

  const paper = React.useMemo(
    () => PAPER_SIZES.find((p) => p.id === paperId) ?? PAPER_SIZES[0]!,
    [paperId],
  );

  const layout = React.useMemo(
    () =>
      computeImposition({
        sheetWidthCm: paper.widthCm,
        sheetHeightCm: paper.heightCm,
        cardWidthCm: widthCm,
        cardHeightCm: heightCm,
        bleedMm,
        gapMm,
        marginMm,
        markLengthMm: 4,
        allowRotation,
      }),
    [paper, widthCm, heightCm, bleedMm, gapMm, marginMm, allowRotation],
  );

  const totalSheets = sheetsNeeded(copies, layout.perSheet);
  const bleedCm = includeBleed ? bleedMm / 10 : 0;
  const exportWcm = widthCm + 2 * bleedCm;
  const exportHcm = heightCm + 2 * bleedCm;

  async function handleExportRaster(format: "png" | "jpeg", side: "front" | "back") {
    setBusy(`${format}-${side}`);
    setError(null);
    try {
      const doc = side === "back" && backDoc ? backDoc : frontDoc;
      const blob = await renderCardToBlob({
        doc,
        widthCm,
        heightCm,
        bleedMm,
        includeBleed,
        format,
        quality: 0.95,
        qr,
      });
      const ext = format === "jpeg" ? "jpg" : "png";
      downloadBlob(blob, `${safeSlug}-${side}-300dpi.${ext}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleExportSinglePdf() {
    setBusy("pdf");
    setError(null);
    try {
      const blob = await exportSingleCardPdf({
        frontDoc,
        backDoc,
        isDoubleSided,
        widthCm,
        heightCm,
        bleedMm,
        includeBleed,
        qr,
      });
      downloadBlob(blob, `${safeSlug}-print-ready.pdf`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleExportImposedPdf() {
    setBusy("impose");
    setError(null);
    try {
      const frontPng = await renderCardPngBytes({
        doc: frontDoc,
        widthCm,
        heightCm,
        bleedMm,
        includeBleed: true,
        qr,
      });
      const backPng =
        isDoubleSided && backDoc
          ? await renderCardPngBytes({
              doc: backDoc,
              widthCm,
              heightCm,
              bleedMm,
              includeBleed: true,
              qr,
            })
          : null;

      const blob = await exportImposedPdf({
        paper,
        cardWidthCm: widthCm,
        cardHeightCm: heightCm,
        bleedMm,
        gapMm,
        marginMm,
        allowRotation,
        isDoubleSided,
        single: {
          copies,
          frontPng,
          backPng,
        },
      });
      downloadBlob(blob, `${safeSlug}-imposed-${paper.id}.pdf`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Exportar Archivos de Impresión (300 DPI)"
        description={`Corte ${widthCm} × ${heightCm} cm (${cmToPx(exportWcm)} × ${cmToPx(exportHcm)} px @ 300 DPI)`}
        className="max-w-xl"
      >
        {lowResWarnings.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">Advertencia de Imagen de Baja Resolución (RNF-02)</p>
              <p className="mt-0.5">
                Las siguientes capas de imagen tienen una resolución efectiva de impresión menor a 240 DPI en su tamaño actual en cm:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {lowResWarnings.map((w) => (
                  <li key={`${w.side}-${w.layerId}`}>
                    <strong>{w.name}</strong> ({w.side}): {w.dpi} DPI ({w.naturalWidth}px a {w.widthCm} cm)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="raster">
              <FileImage />
              PNG / JPG (300 DPI)
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileText />
              PDF Listo para Imprenta
            </TabsTrigger>
            <TabsTrigger value="impose">
              <Grid2x2 />
              Imposición en Pliego
            </TabsTrigger>
          </TabsList>

          <TabsContent value="raster" className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Incluir margen de sangrado de {bleedMm} mm</p>
                <p className="text-xs text-muted-foreground">
                  Tamaño de salida: {cmToPx(exportWcm)} × {cmToPx(exportHcm)} px
                </p>
              </div>
              <Switch checked={includeBleed} onCheckedChange={setIncludeBleed} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">PNG (Sin pérdida)</span>
                  <Badge tone="default">
                    {frontDoc.background.kind === "none" ? "Alfa Transparente" : "300 DPI"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Conserva la transparencia alfa real cuando el fondo está desactivado (RF-04.1).
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleExportRaster("png", "front")}
                    disabled={busy !== null}
                  >
                    <Download />
                    {busy === "png-front" ? "Renderizando..." : "PNG Frente"}
                  </Button>
                  {isDoubleSided && backDoc && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportRaster("png", "back")}
                      disabled={busy !== null}
                    >
                      <Download />
                      {busy === "png-back" ? "Renderizando..." : "PNG Reverso"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">JPG (Calidad 0.95)</span>
                  <Badge tone="muted">Base Blanca</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rasterizado a 300 DPI con capa base automática #FFFFFF (RF-04.1).
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleExportRaster("jpeg", "front")}
                    disabled={busy !== null}
                  >
                    <Download />
                    {busy === "jpeg-front" ? "Renderizando..." : "JPG Frente"}
                  </Button>
                  {isDoubleSided && backDoc && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportRaster("jpeg", "back")}
                      disabled={busy !== null}
                    >
                      <Download />
                      {busy === "jpeg-back" ? "Renderizando..." : "JPG Reverso"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pdf" className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Incluir sangrado de {bleedMm} mm y TrimBox/BleedBox en PDF</p>
                <p className="text-xs text-muted-foreground">
                  Puntos físicos exactos: {cmToPt(exportWcm).toFixed(2)} × {cmToPt(exportHcm).toFixed(2)} pt (
                  {isDoubleSided && backDoc ? "2 páginas: Frente + Reverso" : "1 página: Frente"})
                </p>
              </div>
              <Switch checked={includeBleed} onCheckedChange={setIncludeBleed} />
            </div>

            <Button onClick={handleExportSinglePdf} disabled={busy !== null} className="w-full">
              <Download />
              {busy === "pdf" ? "Generando PDF Listo para Imprenta..." : "Descargar PDF Listo para Imprenta"}
            </Button>
          </TabsContent>

          <TabsContent value="impose" className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tamaño de Papel del Pliego">
                <NativeSelect
                  value={paperId}
                  onChange={(e) => setPaperId(e.target.value as PaperSize["id"])}
                >
                  {PAPER_SIZES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Total de Copias">
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                />
              </Field>
              <Field label="Separación entre Tarjetas (mm)">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={gapMm}
                  onChange={(e) => setGapMm(Math.max(0, Number(e.target.value) || 0))}
                />
              </Field>
              <Field label="Margen de Seguridad del Pliego (mm)">
                <Input
                  type="number"
                  min={5}
                  max={30}
                  step={0.5}
                  value={marginMm}
                  onChange={(e) => setMarginMm(Math.max(0, Number(e.target.value) || 0))}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Rotar automáticamente 90° para aprovechar el pliego</p>
                <p className="text-xs text-muted-foreground">
                  Incluye marcas de corte (4 mm) vectoriales para guillotina (0.25 pt) en cada esquina
                </p>
              </div>
              <Switch checked={allowRotation} onCheckedChange={setAllowRotation} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-4 py-3 text-xs">
              <span>
                Retícula:{" "}
                <strong>
                  {layout.cols} × {layout.rows} ({layout.perSheet} tarjetas/pliego)
                </strong>{" "}
                {layout.rotated ? "(Rotado 90°)" : ""}
              </span>
              <span>
                Pliegos requeridos:{" "}
                <strong>
                  {totalSheets} {isDoubleSided && backDoc ? "pliegos doble cara (2 páginas c/u)" : "pliego(s)"}
                </strong>
              </span>
            </div>

            <Button
              onClick={handleExportImposedPdf}
              disabled={busy !== null || layout.perSheet === 0}
              className="w-full"
            >
              <Download />
              {busy === "impose"
                ? "Generando PDF de Imposición en Pliego..."
                : `Descargar PDF Impuesto (${layout.perSheet}/pliego)`}
            </Button>
          </TabsContent>
        </Tabs>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
