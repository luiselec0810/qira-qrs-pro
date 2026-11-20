"use client";

import * as React from "react";
import JSZip from "jszip";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Grid2x2,
  Play,
  Upload,
} from "lucide-react";
import {
  applyTemplate,
  computeImposition,
  DEFAULT_QR_STYLE,
  extractVariables,
  PAPER_SIZES,
  type PaperSize,
  parseCsv,
  type ParsedCsv,
  sheetsNeeded,
} from "@qira/shared";
import { api } from "@/lib/api";
import type { BatchResultDto, CardDto, QrDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/interactive";
import {
  collectCanvasVariables,
  normalizeCanvasDoc,
} from "@/components/studio/types";
import {
  downloadBlob,
  findLowResImages,
  renderCardPngBytes,
} from "@/lib/export/render";
import { exportBatchMultiPagePdf } from "@/lib/export/pdf";
import { exportImposedPdf } from "@/lib/export/impose";

type BatchOutputFormat = "zip" | "pdf" | "imposed";

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function BatchPage() {
  const [cards, setCards] = React.useState<CardDto[]>([]);
  const [qrs, setQrs] = React.useState<QrDto[]>([]);
  const [selectedCardId, setSelectedCardId] = React.useState<string>("");
  const [templateQrId, setTemplateQrId] = React.useState<string>("");

  const [namePrefix, setNamePrefix] = React.useState("Mesa");
  const [defaultUrlTemplate, setDefaultUrlTemplate] = React.useState(
    "https://menu.local/mesa?num={{mesa}}",
  );
  const [parsedCsv, setParsedCsv] = React.useState<ParsedCsv | null>(null);
  const [csvFileName, setCsvFileName] = React.useState<string | null>(null);

  const [outputFormat, setOutputFormat] = React.useState<BatchOutputFormat>("zip");
  const [includeBleed, setIncludeBleed] = React.useState(true);
  const [paperId, setPaperId] = React.useState<PaperSize["id"]>("letter");
  const [gapMm, setGapMm] = React.useState(4);
  const [marginMm, setMarginMm] = React.useState(10);
  const [allowRotation, setAllowRotation] = React.useState(true);

  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState<{ current: number; total: number; phase: string } | null>(
    null,
  );
  const [lastBatch, setLastBatch] = React.useState<BatchResultDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    Promise.all([
      api.get<{ items: CardDto[] }>("/cards"),
      api.get<{ items: QrDto[] }>("/qrs"),
    ])
      .then(([cardsRes, qrsRes]) => {
        setCards(cardsRes.items);
        setQrs(qrsRes.items);
        if (cardsRes.items[0]) {
          setSelectedCardId(cardsRes.items[0].id);
          if (cardsRes.items[0].qrId) {
            setTemplateQrId(cardsRes.items[0].qrId);
          }
        }
        if (qrsRes.items[0]) {
          setTemplateQrId((curr) => curr || qrsRes.items[0]!.id);
        }
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const selectedCard = React.useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  const templateQr = React.useMemo(
    () => qrs.find((q) => q.id === templateQrId) ?? null,
    [qrs, templateQrId],
  );

  const normalizedDocs = React.useMemo(() => {
    if (!selectedCard) return null;
    const front = normalizeCanvasDoc(
      selectedCard.frontCanvasJson,
      selectedCard.widthCm,
      selectedCard.heightCm,
      true,
    );
    const back =
      selectedCard.isDoubleSided && selectedCard.backCanvasJson
        ? normalizeCanvasDoc(
            selectedCard.backCanvasJson,
            selectedCard.widthCm,
            selectedCard.heightCm,
            false,
          )
        : null;
    return { front, back };
  }, [selectedCard]);

  const requiredVariables = React.useMemo(() => {
    const canvasVars = normalizedDocs
      ? collectCanvasVariables(normalizedDocs.front, normalizedDocs.back)
      : [];
    const urlVars = extractVariables(defaultUrlTemplate);
    return [...new Set([...urlVars, ...canvasVars])];
  }, [normalizedDocs, defaultUrlTemplate]);

  const lowResWarnings = React.useMemo(() => {
    if (!normalizedDocs) return [];
    return [
      ...findLowResImages(normalizedDocs.front),
      ...findLowResImages(normalizedDocs.back),
    ];
  }, [normalizedDocs]);

  const paper = React.useMemo(
    () => PAPER_SIZES.find((p) => p.id === paperId) ?? PAPER_SIZES[0]!,
    [paperId],
  );

  const impositionLayout = React.useMemo(() => {
    if (!selectedCard) return null;
    return computeImposition({
      sheetWidthCm: paper.widthCm,
      sheetHeightCm: paper.heightCm,
      cardWidthCm: selectedCard.widthCm,
      cardHeightCm: selectedCard.heightCm,
      bleedMm: selectedCard.bleedMm,
      gapMm,
      marginMm,
      markLengthMm: 4,
      allowRotation,
    });
  }, [selectedCard, paper, gapMm, marginMm, allowRotation]);

  async function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvFileName(file.name);
    setParsedCsv(parsed);
    setLastBatch(null);
    setError(null);
  }

  function loadSampleCsv() {
    const sample = "mesa,zona,mesero\n1,Terraza,Carlos\n2,Terraza,Carlos\n3,Salon,Ana\n4,Salon,Ana";
    setCsvFileName("sample-mesas.csv");
    setParsedCsv(parseCsv(sample));
    setLastBatch(null);
    setError(null);
  }

  async function handleRunBatch() {
    if (!selectedCard || !normalizedDocs) {
      setError("Por favor selecciona primero un diseño de tarjeta guardado.");
      return;
    }
    if (!parsedCsv || parsedCsv.rows.length === 0) {
      setError("Por favor sube un archivo CSV con al menos una fila de datos.");
      return;
    }

    setRunning(true);
    setError(null);
    setProgress({
      current: 0,
      total: parsedCsv.rows.length,
      phase: "Creando QRs dinámicos en PostgreSQL...",
    });

    try {
      const styleConfig = templateQr?.styleConfig ?? DEFAULT_QR_STYLE;
      const batchResult = await api.post<BatchResultDto>("/batches", {
        namePrefix: namePrefix.trim() || "Lote",
        defaultUrlTemplate: defaultUrlTemplate.trim(),
        rows: parsedCsv.rows,
        styleConfig,
        cardId: selectedCard.id,
      });

      setLastBatch(batchResult);

      if (batchResult.items.length === 0) {
        throw new Error(
          batchResult.errors[0]?.message ?? "No se pudieron generar filas válidas.",
        );
      }

      const renderedItems: Array<{
        item: BatchResultDto["items"][number];
        frontPng: Uint8Array;
        backPng: Uint8Array | null;
      }> = [];

      for (let i = 0; i < batchResult.items.length; i++) {
        const item = batchResult.items[i]!;
        setProgress({
          current: i + 1,
          total: batchResult.items.length,
          phase: `Renderizando tarjeta ${i + 1} de ${batchResult.items.length} a 300 DPI (/q/${item.slug})...`,
        });

        const frontPng = await renderCardPngBytes({
          doc: normalizedDocs.front,
          widthCm: selectedCard.widthCm,
          heightCm: selectedCard.heightCm,
          bleedMm: selectedCard.bleedMm,
          includeBleed: outputFormat === "imposed" ? true : includeBleed,
          qr: { shortUrl: item.shortUrl, styleConfig: item.styleConfig },
          variables: item.row,
        });

        const backPng =
          selectedCard.isDoubleSided && normalizedDocs.back
            ? await renderCardPngBytes({
                doc: normalizedDocs.back,
                widthCm: selectedCard.widthCm,
                heightCm: selectedCard.heightCm,
                bleedMm: selectedCard.bleedMm,
                includeBleed: outputFormat === "imposed" ? true : includeBleed,
                qr: { shortUrl: item.shortUrl, styleConfig: item.styleConfig },
                variables: item.row,
              })
            : null;

        renderedItems.push({ item, frontPng, backPng });
      }

      setProgress({
        current: renderedItems.length,
        total: renderedItems.length,
        phase: "Empaquetando archivos de impresión...",
      });

      const slugPrefix =
        (namePrefix || "batch")
          .toLowerCase()
          .replace(/[^a-z0-9-_]+/g, "-")
          .replace(/^-+|-+$/g, "") || "batch";

      if (outputFormat === "zip") {
        const zip = new JSZip();
        const csvHeaders = parsedCsv.headers;
        const manifestLines = [
          ["index", "qr_id", "name", "slug", "short_url", "default_url", ...csvHeaders]
            .map(escapeCsvCell)
            .join(","),
        ];

        renderedItems.forEach(({ item, frontPng, backPng }, idx) => {
          const num = String(idx + 1).padStart(3, "0");
          zip.file(`${num}-${item.slug}-front.png`, frontPng);
          if (backPng) {
            zip.file(`${num}-${item.slug}-back.png`, backPng);
          }
          manifestLines.push(
            [
              String(idx + 1),
              item.id,
              item.name,
              item.slug,
              item.shortUrl,
              item.defaultUrl ?? "",
              ...csvHeaders.map((h) => item.row[h] ?? ""),
            ]
              .map(escapeCsvCell)
              .join(","),
          );
        });

        zip.file("manifest.csv", manifestLines.join("\n"));
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, `${slugPrefix}-300dpi-cards.zip`);
      } else if (outputFormat === "pdf") {
        const pdfBlob = await exportBatchMultiPagePdf({
          items: renderedItems.map((r) => ({
            frontPng: r.frontPng,
            backPng: r.backPng,
          })),
          widthCm: selectedCard.widthCm,
          heightCm: selectedCard.heightCm,
          bleedMm: selectedCard.bleedMm,
          includeBleed,
          isDoubleSided: selectedCard.isDoubleSided,
        });
        downloadBlob(pdfBlob, `${slugPrefix}-multipage.pdf`);
      } else {
        const imposedBlob = await exportImposedPdf({
          paper,
          cardWidthCm: selectedCard.widthCm,
          cardHeightCm: selectedCard.heightCm,
          bleedMm: selectedCard.bleedMm,
          gapMm,
          marginMm,
          allowRotation,
          isDoubleSided: selectedCard.isDoubleSided,
          items: renderedItems.map((r) => ({
            frontPng: r.frontPng,
            backPng: r.backPng,
          })),
        });
        downloadBlob(imposedBlob, `${slugPrefix}-imposed-${paper.id}.pdf`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Generación Masiva por CSV e Imposición en Pliego (RF-04.2 / RF-04.3)"
        description="Sube un archivo CSV para crear en lote N códigos QR dinámicos en PostgreSQL, sustituir {{variables}} en tu diseño de tarjeta y exportar PNGs a 300 DPI (.zip) o pliegos impuestos con marcas de corte (4 mm) para guillotina."
      />

      <div className="grid gap-6 px-6 lg:grid-cols-3">
        {/* Step 1 & 2: Card + Dynamic QR Template Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>1. Diseño de Tarjeta y Plantilla de URL Dinámica</CardTitle>
            <CardDescription>
              Cada fila del CSV crea un QR dinámico único con su propio slug corto y sustituye variables tanto en la URL de destino como en las capas de texto de la tarjeta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Diseño de Tarjeta (Print Studio)">
                <NativeSelect
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                >
                  {cards.length === 0 && <option value="">Sin tarjetas guardadas — crea una en Studio</option>}
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.widthCm} × {c.heightCm} cm)
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Plantilla de Estilo Visual del QR">
                <NativeSelect
                  value={templateQrId}
                  onChange={(e) => setTemplateQrId(e.target.value)}
                >
                  <option value="">Estilo Predeterminado de Alto Contraste</option>
                  {qrs.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} (/q/{q.slug})
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <Field
                label="Prefijo de Nombre del QR"
                hint="Las filas se nombrarán p. ej. 'Mesa 1', 'Mesa 2' (o la columna {{name}} si existe)"
              >
                <Input
                  value={namePrefix}
                  onChange={(e) => setNamePrefix(e.target.value)}
                  placeholder="Mesa"
                />
              </Field>

              <Field
                label="Plantilla de URL de Destino"
                hint="Admite marcadores {{variable}} de las columnas del CSV"
              >
                <Input
                  value={defaultUrlTemplate}
                  onChange={(e) => setDefaultUrlTemplate(e.target.value)}
                  placeholder="https://menu.local/mesa?num={{mesa}}"
                />
              </Field>
            </div>

            {lowResWarnings.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">Advertencia de Imagen de Baja Resolución (RNF-02)</p>
                  <p>
                    El diseño de tarjeta seleccionado contiene capas de imagen con menos de 240 DPI:{" "}
                    {lowResWarnings.map((w) => `${w.name} (${w.dpi} DPI)`).join(", ")}.
                  </p>
                </div>
              </div>
            )}

            {/* Variable Matching Status */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Variables detectadas ({requiredVariables.length})
              </p>
              {requiredVariables.length === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Aún no se detectaron <code>{"{{variables}}"}</code>. Agrega marcadores como{" "}
                  <code>{"{{mesa}}"}</code> a una capa de texto en Print Studio o en la plantilla de URL arriba.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {requiredVariables.map((v) => {
                    const matched = parsedCsv ? parsedCsv.headers.includes(v) : false;
                    return (
                      <Badge
                        key={v}
                        tone={!parsedCsv ? "default" : matched ? "success" : "warning"}
                        className="font-mono"
                      >
                        {`{{${v}}}`}
                        {parsedCsv ? (matched ? " ✓" : " (columna faltante)") : ""}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Output Format & Imposition Settings */}
        <Card>
          <CardHeader>
            <CardTitle>2. Salida e Imposición en Pliego</CardTitle>
            <CardDescription>
              Elige archivos individuales a 300 DPI o pliegos impuestos con marcas de corte (4 mm) para guillotina.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setOutputFormat("zip")}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left text-xs transition-colors ${
                  outputFormat === "zip" ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
              >
                <FileArchive className="size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">ZIP de PNGs a 300 DPI + manifest.csv</p>
                  <p className="text-muted-foreground">
                    PNGs individuales listos para imprenta y manifiesto de slugs
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOutputFormat("pdf")}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left text-xs transition-colors ${
                  outputFormat === "pdf" ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
              >
                <FileText className="size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">PDF Multipágina de Impresión</p>
                  <p className="text-muted-foreground">
                    Puntos físicos exactos con TrimBox y BleedBox
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOutputFormat("imposed")}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left text-xs transition-colors ${
                  outputFormat === "imposed" ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
              >
                <Grid2x2 className="size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">PDF de Imposición en Pliego (RF-04.3)</p>
                  <p className="text-muted-foreground">
                    Retícula en Carta / A4 / Tabloide con marcas de corte (4 mm)
                  </p>
                </div>
              </button>
            </div>

            {outputFormat !== "imposed" ? (
              <div className="flex items-center justify-between rounded-lg border p-3 text-xs">
                <span>Incluir margen de sangrado de {selectedCard?.bleedMm ?? 3} mm</span>
                <Switch checked={includeBleed} onCheckedChange={setIncludeBleed} />
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border p-3 text-xs">
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
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Separación (mm)">
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={gapMm}
                      onChange={(e) => setGapMm(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </Field>
                  <Field label="Margen (mm)">
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
                <div className="flex items-center justify-between">
                  <span>Rotar 90° automáticamente para mejor ajuste</span>
                  <Switch checked={allowRotation} onCheckedChange={setAllowRotation} />
                </div>
                {impositionLayout && (
                  <div className="rounded bg-muted p-2 text-xs">
                    Capacidad: <strong>{impositionLayout.perSheet} tarjetas/pliego</strong> (
                    {impositionLayout.cols} × {impositionLayout.rows}) • Total de pliegos:{" "}
                    <strong>
                      {sheetsNeeded(parsedCsv?.rows.length ?? 0, impositionLayout.perSheet)}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: CSV Upload & Preview Table */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>3. Subir CSV y Generar Lote</CardTitle>
              <CardDescription>
                Admite delimitadores de coma (<code>,</code>) y punto y coma (<code>;</code>).
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadSampleCsv}>
                <FileSpreadsheet />
                Cargar CSV de Ejemplo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload />
                {csvFileName ? `Archivo: ${csvFileName}` : "Subir Archivo .CSV"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvFile}
              />
              <Button
                size="sm"
                disabled={running || !parsedCsv || parsedCsv.rows.length === 0 || !selectedCard}
                onClick={() => void handleRunBatch()}
              >
                {running ? <Download className="animate-bounce" /> : <Play />}
                {running
                  ? "Generando Lote..."
                  : `Generar ${parsedCsv?.rows.length ?? 0} Tarjetas (300 DPI)`}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {progress && (
              <div className="space-y-1.5 rounded-lg border bg-primary/5 p-3">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>{progress.phase}</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.round((progress.current / Math.max(1, progress.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {lastBatch && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>
                    Se crearon <strong>{lastBatch.items.length}</strong> códigos QR dinámicos en el lote{" "}
                    <code className="font-mono">{lastBatch.batchId.slice(0, 8)}</code> y se descargó
                    la salida a 300 DPI.
                  </span>
                </div>
                {lastBatch.errors.length > 0 && (
                  <Badge tone="warning">{lastBatch.errors.length} error(es) de fila</Badge>
                )}
              </div>
            )}

            {!parsedCsv ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Sube un archivo <code>.csv</code> o haz clic en <strong>Cargar CSV de Ejemplo</strong> para previsualizar
                las filas y la sustitución de variables.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {parsedCsv.headers.map((h) => (
                        <th key={h} className="px-3 py-2 font-mono">
                          {h}
                        </th>
                      ))}
                      <th className="px-3 py-2">Vista Previa de URL de Destino Resuelta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedCsv.rows.slice(0, 25).map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        {parsedCsv.headers.map((h) => (
                          <td key={h} className="px-3 py-2">
                            {row[h]}
                          </td>
                        ))}
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {applyTemplate(defaultUrlTemplate, row, {
                            encode: true,
                            keepMissing: true,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedCsv.rows.length > 25 && (
                  <p className="border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Mostrando las primeras 25 de {parsedCsv.rows.length} filas.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
