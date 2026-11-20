"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  QrCode,
  Redo2,
  RefreshCw,
  Ruler,
  Save,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from "lucide-react";
import {
  CARD_PRESETS,
  cmToPx,
  DEFAULT_BLEED_MM,
  effectiveDpi,
  LOW_RES_DPI_THRESHOLD,
} from "@qira/shared";
import { api } from "@/lib/api";
import type { CardDto, QrDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/card";
import { Switch } from "@/components/ui/interactive";
import {
  type CanvasBackground,
  type CanvasDoc,
  type CanvasLayer,
  collectCanvasVariables,
  createDefaultCanvasDoc,
  makeLayerId,
  normalizeCanvasDoc,
  STUDIO_FONTS,
} from "./types";
import { loadHtmlImage } from "@/lib/export/render";
import { ExportDialog } from "./export-dialog";

const CanvasStage = dynamic(() => import("./canvas-stage"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 w-96 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
      Cargando lienzo de impresión a 300 DPI...
    </div>
  ),
});

interface DocSnapshot {
  front: CanvasDoc;
  back: CanvasDoc;
}

export interface StudioEditorProps {
  initialCard?: CardDto | null;
  initialPresetId?: string | null;
}

export function StudioEditor({ initialCard, initialPresetId }: StudioEditorProps) {
  const router = useRouter();
  const preset = React.useMemo(
    () => CARD_PRESETS.find((p) => p.id === initialPresetId) ?? CARD_PRESETS[0]!,
    [initialPresetId],
  );

  const [cardId, setCardId] = React.useState<string | null>(initialCard?.id ?? null);
  const [name, setName] = React.useState(initialCard?.name ?? preset.label);
  const [widthCm, setWidthCm] = React.useState(initialCard?.widthCm ?? preset.widthCm);
  const [heightCm, setHeightCm] = React.useState(initialCard?.heightCm ?? preset.heightCm);
  const [bleedMm, setBleedMm] = React.useState(initialCard?.bleedMm ?? DEFAULT_BLEED_MM);
  const [isDoubleSided, setIsDoubleSided] = React.useState(initialCard?.isDoubleSided ?? false);
  const [side, setSide] = React.useState<"front" | "back">("front");
  const [showGuides, setShowGuides] = React.useState(true);
  const [zoom, setZoom] = React.useState(1);

  const [frontDoc, setFrontDoc] = React.useState<CanvasDoc>(() =>
    initialCard
      ? normalizeCanvasDoc(initialCard.frontCanvasJson, initialCard.widthCm, initialCard.heightCm, true)
      : createDefaultCanvasDoc(preset.widthCm, preset.heightCm, true),
  );
  const [backDoc, setBackDoc] = React.useState<CanvasDoc>(() =>
    initialCard?.backCanvasJson
      ? normalizeCanvasDoc(initialCard.backCanvasJson, initialCard.widthCm, initialCard.heightCm, false)
      : createDefaultCanvasDoc(initialCard?.widthCm ?? preset.widthCm, initialCard?.heightCm ?? preset.heightCm, false),
  );

  const [past, setPast] = React.useState<DocSnapshot[]>([]);
  const [future, setFuture] = React.useState<DocSnapshot[]>([]);

  const [selectedLayerId, setSelectedLayerId] = React.useState<string | null>(null);
  const [clipboardLayer, setClipboardLayer] = React.useState<CanvasLayer | null>(null);

  const [qrs, setQrs] = React.useState<QrDto[]>([]);
  const [qrId, setQrId] = React.useState<string | null>(initialCard?.qrId ?? null);
  const [loadingQrs, setLoadingQrs] = React.useState(false);

  const [saving, setSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const bgImageInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeDoc = side === "back" ? backDoc : frontDoc;

  const commitDocChange = React.useCallback(
    (updater: (prev: CanvasDoc) => CanvasDoc) => {
      setPast((h) => [...h.slice(-39), { front: frontDoc, back: backDoc }]);
      setFuture([]);
      if (side === "back") {
        setBackDoc((prev) => updater(prev));
      } else {
        setFrontDoc((prev) => updater(prev));
      }
    },
    [frontDoc, backDoc, side],
  );

  const handleUndo = React.useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const last = prevPast[prevPast.length - 1]!;
      setFuture((f) => [{ front: frontDoc, back: backDoc }, ...f]);
      setFrontDoc(last.front);
      setBackDoc(last.back);
      return prevPast.slice(0, -1);
    });
  }, [frontDoc, backDoc]);

  const handleRedo = React.useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const [next, ...rest] = prevFuture;
      if (!next) return prevFuture;
      setPast((p) => [...p, { front: frontDoc, back: backDoc }]);
      setFrontDoc(next.front);
      setBackDoc(next.back);
      return rest;
    });
  }, [frontDoc, backDoc]);

  // Fetch linked QRs and refresh on window focus so QR style edits update reactively (RF-03.4).
  const fetchQrs = React.useCallback(async () => {
    setLoadingQrs(true);
    try {
      const res = await api.get<{ items: QrDto[] }>("/qrs");
      setQrs(res.items);
      setQrId((current) => current ?? res.items[0]?.id ?? null);
    } catch {
      // Keep existing list if offline.
    } finally {
      setLoadingQrs(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchQrs();
    const onFocus = () => void fetchQrs();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchQrs]);

  const linkedQr = React.useMemo(
    () => qrs.find((q) => q.id === qrId) ?? null,
    [qrs, qrId],
  );

  const selectedLayer = React.useMemo(
    () => activeDoc.layers.find((l) => l.id === selectedLayerId) ?? null,
    [activeDoc.layers, selectedLayerId],
  );

  const updateLayer = React.useCallback(
    (id: string, patch: Partial<CanvasLayer>) => {
      commitDocChange((doc) => ({
        ...doc,
        layers: doc.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as CanvasLayer) : l)),
      }));
    },
    [commitDocChange],
  );

  const deleteLayer = React.useCallback(
    (id: string) => {
      commitDocChange((doc) => ({
        ...doc,
        layers: doc.layers.filter((l) => l.id !== id),
      }));
      if (selectedLayerId === id) setSelectedLayerId(null);
    },
    [commitDocChange, selectedLayerId],
  );

  // Keyboard shortcuts (RF-03.4): Delete/Backspace, Ctrl+Z, Ctrl+Y/Ctrl+Shift+Z, Ctrl+C/Ctrl+V, arrows
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selectedLayer) {
        e.preventDefault();
        setClipboardLayer(selectedLayer);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v" && clipboardLayer) {
        e.preventDefault();
        const cloneId = makeLayerId(clipboardLayer.kind);
        const clone: CanvasLayer = {
          ...clipboardLayer,
          id: cloneId,
          name: `${clipboardLayer.name} (Copia)`,
          x: Math.round((clipboardLayer.x + 0.4) * 100) / 100,
          y: Math.round((clipboardLayer.y + 0.4) * 100) / 100,
        };
        commitDocChange((doc) => ({ ...doc, layers: [...doc.layers, clone] }));
        setSelectedLayerId(cloneId);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedLayer && !selectedLayer.locked) {
        e.preventDefault();
        deleteLayer(selectedLayer.id);
        return;
      }
      if (
        selectedLayer &&
        !selectedLayer.locked &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 0.5 : 0.1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateLayer(selectedLayer.id, {
          x: Math.round((selectedLayer.x + dx) * 100) / 100,
          y: Math.round((selectedLayer.y + dy) * 100) / 100,
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedLayer, clipboardLayer, handleUndo, handleRedo, deleteLayer, updateLayer, commitDocChange]);

  function addTextLayer() {
    const id = makeLayerId("txt");
    const newLayer: CanvasLayer = {
      id,
      name: `Texto ${activeDoc.layers.length + 1}`,
      kind: "text",
      x: Math.round(widthCm * 0.15 * 100) / 100,
      y: Math.round(heightCm * 0.15 * 100) / 100,
      width: Math.round(widthCm * 0.7 * 100) / 100,
      height: 1.5,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      text: "Mesa {{mesa}}",
      fontFamily: STUDIO_FONTS[0],
      fontSizePt: 16,
      fontStyle: "normal",
      fill: "#111827",
      align: "center",
      lineHeight: 1.2,
      stroke: "#000000",
      strokeWidth: 0,
      shadowColor: "#000000",
      shadowBlur: 0,
    };
    commitDocChange((doc) => ({ ...doc, layers: [...doc.layers, newLayer] }));
    setSelectedLayerId(id);
  }

  function addQrLayer() {
    const id = makeLayerId("qr");
    const size = Math.round(Math.min(widthCm, heightCm) * 0.45 * 10) / 10;
    const newLayer: CanvasLayer = {
      id,
      name: "QR Dinámico",
      kind: "qr",
      x: Math.round(((widthCm - size) / 2) * 100) / 100,
      y: Math.round(((heightCm - size) / 2) * 100) / 100,
      width: size,
      height: size,
      sizeCm: size,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
    };
    commitDocChange((doc) => ({ ...doc, layers: [...doc.layers, newLayer] }));
    setSelectedLayerId(id);
  }

  function addRectLayer() {
    const id = makeLayerId("rect");
    const w = Math.round(widthCm * 0.6 * 100) / 100;
    const h = Math.round(heightCm * 0.25 * 100) / 100;
    const newLayer: CanvasLayer = {
      id,
      name: `Rectángulo ${activeDoc.layers.length + 1}`,
      kind: "rect",
      x: Math.round(((widthCm - w) / 2) * 100) / 100,
      y: Math.round(((heightCm - h) / 2) * 100) / 100,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: "#e0e7ff",
      stroke: "#4f46e5",
      strokeWidth: 1,
      cornerRadiusCm: 0.2,
    };
    commitDocChange((doc) => ({ ...doc, layers: [...doc.layers, newLayer] }));
    setSelectedLayerId(id);
  }

  async function handleUploadLayerImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const uploaded = await api.upload(file);
      const img = await loadHtmlImage(uploaded.url);
      const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      const targetW = Math.round(Math.min(widthCm * 0.5, 6) * 100) / 100;
      const targetH = Math.round((targetW / aspect) * 100) / 100;
      const id = makeLayerId("img");
      const newLayer: CanvasLayer = {
        id,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 32) || "Imagen",
        kind: "image",
        x: Math.round(((widthCm - targetW) / 2) * 100) / 100,
        y: Math.round(((heightCm - targetH) / 2) * 100) / 100,
        width: targetW,
        height: targetH,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        src: uploaded.url,
        naturalWidth: img.naturalWidth || 600,
        naturalHeight: img.naturalHeight || 600,
      };
      commitDocChange((doc) => ({ ...doc, layers: [...doc.layers, newLayer] }));
      setSelectedLayerId(id);
    } catch (err) {
      setSaveMessage(`Error al subir: ${(err as Error).message}`);
    }
  }

  async function handleUploadBackgroundImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const uploaded = await api.upload(file);
      commitDocChange((doc) => ({
        ...doc,
        background: { kind: "image", src: uploaded.url },
      }));
    } catch (err) {
      setSaveMessage(`Error al subir fondo: ${(err as Error).message}`);
    }
  }

  function moveLayerOrder(id: string, dir: "up" | "down" | "front" | "back") {
    commitDocChange((doc) => {
      const idx = doc.layers.findIndex((l) => l.id === id);
      if (idx === -1) return doc;
      const next = [...doc.layers];
      const [item] = next.splice(idx, 1);
      if (!item) return doc;
      if (dir === "front") next.push(item);
      else if (dir === "back") next.unshift(item);
      else if (dir === "up") next.splice(Math.min(next.length, idx + 1), 0, item);
      else next.splice(Math.max(0, idx - 1), 0, item);
      return { ...doc, layers: next };
    });
  }

  function centerLayer(id: string, axis: "h" | "v") {
    const layer = activeDoc.layers.find((l) => l.id === id);
    if (!layer) return;
    if (axis === "h") {
      updateLayer(id, { x: Math.round(((widthCm - layer.width) / 2) * 100) / 100 });
    } else {
      updateLayer(id, { y: Math.round(((heightCm - layer.height) / 2) * 100) / 100 });
    }
  }

  function setBackground(background: CanvasBackground) {
    commitDocChange((doc) => ({ ...doc, background }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = {
        name: name.trim() || "Tarjeta sin título",
        qrId,
        widthCm,
        heightCm,
        bleedMm,
        isDoubleSided,
        frontCanvasJson: frontDoc,
        backCanvasJson: isDoubleSided ? backDoc : null,
      };
      if (cardId) {
        const updated = await api.patch<CardDto>(`/cards/${cardId}`, payload);
        setCardId(updated.id);
        setSaveMessage("Guardado");
      } else {
        const created = await api.post<CardDto>("/cards", payload);
        setCardId(created.id);
        setSaveMessage("Guardado");
        router.replace(`/studio/${created.id}`);
      }
    } catch (e) {
      setSaveMessage(`Error: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  const detectedVariables = React.useMemo(
    () => collectCanvasVariables(frontDoc, isDoubleSided ? backDoc : null),
    [frontDoc, backDoc, isDoubleSided],
  );

  const selectedImageDpi =
    selectedLayer?.kind === "image" && selectedLayer.width > 0
      ? Math.round(effectiveDpi(selectedLayer.naturalWidth, selectedLayer.width))
      : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted/30">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/studio">
              <ArrowLeft />
              Studio
            </Link>
          </Button>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-44 text-sm font-medium"
            placeholder="Nombre del diseño"
          />

          <NativeSelect
            className="h-8 w-44 text-xs"
            value={
              CARD_PRESETS.find((p) => p.widthCm === widthCm && p.heightCm === heightCm)?.id ??
              "custom"
            }
            onChange={(e) => {
              const p = CARD_PRESETS.find((item) => item.id === e.target.value);
              if (p) {
                setWidthCm(p.widthCm);
                setHeightCm(p.heightCm);
              }
            }}
          >
            {CARD_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Dimensiones Personalizadas</option>
          </NativeSelect>

          <div className="flex items-center gap-1 text-xs">
            <Input
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={widthCm}
              onChange={(e) => setWidthCm(Math.max(1, Number(e.target.value) || 1))}
              className="h-8 w-16 px-2 text-xs"
              aria-label="Ancho en cm"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={heightCm}
              onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value) || 1))}
              className="h-8 w-16 px-2 text-xs"
              aria-label="Alto en cm"
            />
            <span className="text-muted-foreground">cm</span>
          </div>

          <Badge tone="default" className="font-mono text-[11px]">
            {cmToPx(widthCm)} × {cmToPx(heightCm)} px @ 300 DPI
          </Badge>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Sangrado (Bleed):</span>
            <Input
              type="number"
              min={0}
              max={15}
              step={0.5}
              value={bleedMm}
              onChange={(e) => setBleedMm(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 w-14 px-2 text-xs"
            />
            <span className="text-muted-foreground">mm</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Double-sided + Front/Back toggle (RF-03.3) */}
          <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1 text-xs">
            <span>Doble cara</span>
            <Switch
              checked={isDoubleSided}
              onCheckedChange={(checked) => {
                setIsDoubleSided(checked);
                if (!checked) setSide("front");
              }}
            />
            {isDoubleSided && (
              <div className="ml-1 flex rounded bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSide("front");
                    setSelectedLayerId(null);
                  }}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    side === "front" ? "bg-background shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  Frente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSide("back");
                    setSelectedLayerId(null);
                  }}
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    side === "back" ? "bg-background shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  Reverso
                </button>
              </div>
            )}
          </div>

          <Button
            variant={showGuides ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowGuides((g) => !g)}
            title="Alternar guías de corte no imprimibles y sangrado de 3 mm"
          >
            <Ruler />
            Guías de corte
          </Button>

          {/* Linked QR Selector + Reactive Refresh (RF-03.4) */}
          <div className="flex items-center gap-1">
            <NativeSelect
              className="h-8 w-44 text-xs"
              value={qrId ?? ""}
              onChange={(e) => setQrId(e.target.value || null)}
            >
              <option value="">Sin QR Vinculado</option>
              {qrs.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} (/q/{q.slug})
                </option>
              ))}
            </NativeSelect>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => void fetchQrs()}
              disabled={loadingQrs}
              title="Actualizar estilo del QR desde el servidor"
            >
              <RefreshCw className={loadingQrs ? "animate-spin" : ""} />
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handleUndo}
            disabled={past.length === 0}
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={handleRedo}
            disabled={future.length === 0}
            title="Rehacer (Ctrl+Y)"
          >
            <Redo2 />
          </Button>

          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
            <Save />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
          <Button size="sm" onClick={() => setExportOpen(true)}>
            <Download />
            Exportar
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex min-h-0 flex-1">
        {/* Left Sidebar: Add Tools, Background & Z-Order Layers */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-card p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agregar Elementos ({side === "front" ? "Frente" : "Reverso"})
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={addTextLayer}>
                <Type />
                Agregar Texto
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus />
                Subir Imagen
              </Button>
              <Button variant="outline" size="sm" onClick={addQrLayer}>
                <QrCode />
                Insertar QR
              </Button>
              <Button variant="outline" size="sm" onClick={addRectLayer}>
                <Square />
                Rectángulo
              </Button>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleUploadLayerImage}
            />
          </div>

          {/* Background Controls (RF-03.4, RF-04.1) */}
          <div className="space-y-2.5 border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fondo
            </p>
            <NativeSelect
              value={activeDoc.background.kind}
              onChange={(e) => {
                const k = e.target.value as CanvasBackground["kind"];
                if (k === "none") setBackground({ kind: "none" });
                else if (k === "solid") setBackground({ kind: "solid", color: "#ffffff" });
                else if (k === "gradient")
                  setBackground({
                    kind: "gradient",
                    type: "linear",
                    rotation: 45,
                    from: "#eef2ff",
                    to: "#c7d2fe",
                  });
                else if (k === "image") bgImageInputRef.current?.click();
              }}
            >
              <option value="none">Transparente (PNG Alfa)</option>
              <option value="solid">Color sólido</option>
              <option value="gradient">Degradado</option>
              <option value="image">Imagen</option>
            </NativeSelect>

            {activeDoc.background.kind === "solid" && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={activeDoc.background.color}
                  onChange={(e) =>
                    setBackground({ kind: "solid", color: e.target.value })
                  }
                  className="h-8 w-10 cursor-pointer rounded border"
                />
                <Input
                  value={activeDoc.background.color}
                  onChange={(e) =>
                    setBackground({ kind: "solid", color: e.target.value })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            )}

            {activeDoc.background.kind === "gradient" && (
              <div className="space-y-2 rounded-md border p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span>Tipo</span>
                  <NativeSelect
                    className="h-7 w-28 text-xs"
                    value={activeDoc.background.type}
                    onChange={(e) => {
                      if (activeDoc.background.kind !== "gradient") return;
                      setBackground({
                        ...activeDoc.background,
                        type: e.target.value as "linear" | "radial",
                      });
                    }}
                  >
                    <option value="linear">Lineal</option>
                    <option value="radial">Radial</option>
                  </NativeSelect>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={activeDoc.background.from}
                    onChange={(e) => {
                      if (activeDoc.background.kind !== "gradient") return;
                      setBackground({ ...activeDoc.background, from: e.target.value });
                    }}
                    className="h-7 w-full cursor-pointer rounded border"
                  />
                  <input
                    type="color"
                    value={activeDoc.background.to}
                    onChange={(e) => {
                      if (activeDoc.background.kind !== "gradient") return;
                      setBackground({ ...activeDoc.background, to: e.target.value });
                    }}
                    className="h-7 w-full cursor-pointer rounded border"
                  />
                </div>
                {activeDoc.background.type === "linear" && (
                  <div className="flex items-center justify-between gap-2">
                    <span>Ángulo (°)</span>
                    <Input
                      type="number"
                      min={0}
                      max={360}
                      value={activeDoc.background.rotation}
                      onChange={(e) => {
                        if (activeDoc.background.kind !== "gradient") return;
                        setBackground({
                          ...activeDoc.background,
                          rotation: Number(e.target.value) || 0,
                        });
                      }}
                      className="h-7 w-20 text-xs"
                    />
                  </div>
                )}
              </div>
            )}

            {activeDoc.background.kind === "image" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => bgImageInputRef.current?.click()}
              >
                <ImagePlus />
                Cambiar Imagen de Fondo
              </Button>
            )}
            <input
              ref={bgImageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleUploadBackgroundImage}
            />
          </div>

          {/* Z-Order Layers List */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Capas ({activeDoc.layers.length})
              </p>
              {detectedVariables.length > 0 && (
                <Badge tone="default" title="Variables de plantilla CSV detectadas">
                  {detectedVariables.length} var(s)
                </Badge>
              )}
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              {[...activeDoc.layers].reverse().map((layer) => {
                const isSelected = layer.id === selectedLayerId;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`flex cursor-pointer items-center justify-between gap-1 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                      isSelected ? "border-primary bg-primary/5 font-medium" : "hover:bg-accent/50"
                    }`}
                  >
                    <span className="truncate">{layer.name}</span>
                    <div
                      className="flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => moveLayerOrder(layer.id, "up")}
                        className="rounded p-1 hover:bg-muted"
                        title="Subir capa"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLayerOrder(layer.id, "down")}
                        className="rounded p-1 hover:bg-muted"
                        title="Bajar capa"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayer(layer.id, { locked: !layer.locked })
                        }
                        className="rounded p-1 hover:bg-muted"
                        title={layer.locked ? "Desbloquear capa" : "Bloquear capa"}
                      >
                        {layer.locked ? (
                          <Lock className="size-3.5 text-amber-600" />
                        ) : (
                          <Unlock className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateLayer(layer.id, { visible: !layer.visible })
                        }
                        className="rounded p-1 hover:bg-muted"
                        title={layer.visible ? "Ocultar capa" : "Mostrar capa"}
                      >
                        {layer.visible ? (
                          <Eye className="size-3.5" />
                        ) : (
                          <EyeOff className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteLayer(layer.id)}
                        className="rounded p-1 text-destructive hover:bg-destructive/10"
                        title="Eliminar capa"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center Canvas Viewport */}
        <section className="flex flex-1 flex-col items-center justify-center overflow-auto p-6">
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Corte: <strong>{widthCm} × {heightCm} cm</strong>
            </span>
            <span>•</span>
            <span className="text-cyan-600">Línea cian = Corte final (Trim)</span>
            <span>•</span>
            <span className="text-red-500">Línea roja = Sangrado de {bleedMm} mm</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded border bg-card px-1.5 py-0.5 hover:bg-accent"
                onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}
              >
                -
              </button>
              <span className="w-12 text-center font-mono">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="rounded border bg-card px-1.5 py-0.5 hover:bg-accent"
                onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.15) * 100) / 100))}
              >
                +
              </button>
            </div>
            {saveMessage && (
              <Badge tone={saveMessage.startsWith("Error") ? "destructive" : "success"}>
                {saveMessage}
              </Badge>
            )}
          </div>

          <CanvasStage
            doc={activeDoc}
            widthCm={widthCm}
            heightCm={heightCm}
            bleedMm={bleedMm}
            showGuides={showGuides}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={updateLayer}
            qr={
              linkedQr
                ? { shortUrl: linkedQr.shortUrl, styleConfig: linkedQr.styleConfig }
                : null
            }
            zoom={zoom}
          />
        </section>

        {/* Right Inspector: Selected Layer Properties */}
        <aside className="w-80 shrink-0 overflow-y-auto border-l bg-card p-4">
          {!selectedLayer ? (
            <div className="space-y-3 text-xs text-muted-foreground">
              <p className="font-semibold uppercase tracking-wider">Inspector de Capa</p>
              <p>Selecciona cualquier capa en el lienzo para editar su posición física (cm), tipografía, colores u orden Z.</p>
              {detectedVariables.length > 0 && (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="font-medium text-foreground">Variables detectadas</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {detectedVariables.map((v) => (
                      <Badge key={v} tone="default" className="font-mono">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Capa ({selectedLayer.kind.toUpperCase()})
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => centerLayer(selectedLayer.id, "h")}
                    title="Centrar horizontalmente en la tarjeta"
                  >
                    <AlignHorizontalJustifyCenter className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => centerLayer(selectedLayer.id, "v")}
                    title="Centrar verticalmente en la tarjeta"
                  >
                    <AlignVerticalJustifyCenter className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => moveLayerOrder(selectedLayer.id, "front")}
                    title="Traer al frente"
                  >
                    <ChevronsUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => moveLayerOrder(selectedLayer.id, "back")}
                    title="Enviar al fondo"
                  >
                    <ChevronsDown className="size-3.5" />
                  </Button>
                </div>
              </div>

              <Field label="Nombre de la Capa">
                <Input
                  value={selectedLayer.name}
                  onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="X (cm)">
                  <Input
                    type="number"
                    step={0.1}
                    value={selectedLayer.x}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, { x: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Y (cm)">
                  <Input
                    type="number"
                    step={0.1}
                    value={selectedLayer.y}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, { y: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Ancho (cm)">
                  <Input
                    type="number"
                    min={0.2}
                    step={0.1}
                    value={selectedLayer.width}
                    onChange={(e) => {
                      const val = Math.max(0.2, Number(e.target.value) || 0.2);
                      if (selectedLayer.kind === "qr") {
                        updateLayer(selectedLayer.id, {
                          width: val,
                          height: val,
                          sizeCm: val,
                        });
                      } else {
                        updateLayer(selectedLayer.id, { width: val });
                      }
                    }}
                  />
                </Field>
                <Field label="Alto (cm)">
                  <Input
                    type="number"
                    min={0.2}
                    step={0.1}
                    value={selectedLayer.height}
                    disabled={selectedLayer.kind === "qr"}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        height: Math.max(0.2, Number(e.target.value) || 0.2),
                      })
                    }
                  />
                </Field>
                <Field label="Rotación (°)">
                  <Input
                    type="number"
                    step={1}
                    value={selectedLayer.rotation}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, { rotation: Number(e.target.value) || 0 })
                    }
                  />
                </Field>
                <Field label="Opacidad">
                  <Input
                    type="number"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={selectedLayer.opacity}
                    onChange={(e) =>
                      updateLayer(selectedLayer.id, {
                        opacity: Math.min(1, Math.max(0.05, Number(e.target.value) || 1)),
                      })
                    }
                  />
                </Field>
              </div>

              {/* RNF-02 Low-DPI Warning Badge on Image Layers */}
              {selectedLayer.kind === "image" && selectedImageDpi !== null && (
                <div className="rounded-lg border p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Resolución Efectiva de Impresión</span>
                    <Badge
                      tone={
                        selectedImageDpi < LOW_RES_DPI_THRESHOLD ? "warning" : "success"
                      }
                    >
                      {selectedImageDpi} DPI
                    </Badge>
                  </div>
                  {selectedImageDpi < LOW_RES_DPI_THRESHOLD && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-amber-700">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      Por debajo del umbral de {LOW_RES_DPI_THRESHOLD} DPI. Reduce el ancho físico en cm o sube una imagen de mayor resolución.
                    </p>
                  )}
                </div>
              )}

              {/* Text Layer Specific Controls */}
              {selectedLayer.kind === "text" && (
                <div className="space-y-3 border-t pt-3">
                  <Field
                    label="Contenido de Texto"
                    hint="Admite marcadores {{variable}} para generación masiva por CSV"
                  >
                    <Textarea
                      value={selectedLayer.text}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, { text: e.target.value })
                      }
                    />
                  </Field>

                  <Field label="Tipografía">
                    <NativeSelect
                      value={selectedLayer.fontFamily}
                      onChange={(e) =>
                        updateLayer(selectedLayer.id, { fontFamily: e.target.value })
                      }
                    >
                      {STUDIO_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f.split(",")[0]?.replace(/'/g, "")}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Tamaño (pt)">
                      <Input
                        type="number"
                        min={4}
                        max={200}
                        value={selectedLayer.fontSizePt}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            fontSizePt: Math.max(4, Number(e.target.value) || 12),
                          })
                        }
                      />
                    </Field>
                    <Field label="Estilo">
                      <NativeSelect
                        value={selectedLayer.fontStyle}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            fontStyle: e.target.value as "normal" | "bold" | "italic",
                          })
                        }
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Negrita</option>
                        <option value="italic">Cursiva</option>
                      </NativeSelect>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Color de Texto">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedLayer.fill}
                          onChange={(e) =>
                            updateLayer(selectedLayer.id, { fill: e.target.value })
                          }
                          className="h-9 w-10 cursor-pointer rounded border"
                        />
                        <Input
                          value={selectedLayer.fill}
                          onChange={(e) =>
                            updateLayer(selectedLayer.id, { fill: e.target.value })
                          }
                          className="font-mono text-xs"
                        />
                      </div>
                    </Field>
                    <Field label="Interlineado">
                      <Input
                        type="number"
                        min={0.8}
                        max={3}
                        step={0.1}
                        value={selectedLayer.lineHeight}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            lineHeight: Number(e.target.value) || 1.2,
                          })
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Alineación">
                    <div className="flex gap-1">
                      {(["left", "center", "right"] as const).map((align) => (
                        <Button
                          key={align}
                          type="button"
                          size="sm"
                          variant={selectedLayer.align === align ? "default" : "outline"}
                          className="flex-1"
                          onClick={() => updateLayer(selectedLayer.id, { align })}
                        >
                          {align === "left" && <AlignLeft />}
                          {align === "center" && <AlignCenter />}
                          {align === "right" && <AlignRight />}
                        </Button>
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Color de Contorno">
                      <input
                        type="color"
                        value={selectedLayer.stroke}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, { stroke: e.target.value })
                        }
                        className="h-9 w-full cursor-pointer rounded border"
                      />
                    </Field>
                    <Field label="Contorno (pt)">
                      <Input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        value={selectedLayer.strokeWidth}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            strokeWidth: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </Field>
                    <Field label="Color de Sombra">
                      <input
                        type="color"
                        value={selectedLayer.shadowColor}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, { shadowColor: e.target.value })
                        }
                        className="h-9 w-full cursor-pointer rounded border"
                      />
                    </Field>
                    <Field label="Desenfoque de Sombra">
                      <Input
                        type="number"
                        min={0}
                        max={40}
                        step={1}
                        value={selectedLayer.shadowBlur}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            shadowBlur: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* Shape Layer Specific Controls */}
              {selectedLayer.kind === "rect" && (
                <div className="space-y-3 border-t pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Color de Relleno">
                      <input
                        type="color"
                        value={selectedLayer.fill}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, { fill: e.target.value })
                        }
                        className="h-9 w-full cursor-pointer rounded border"
                      />
                    </Field>
                    <Field label="Radio de Esquina (cm)">
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.05}
                        value={selectedLayer.cornerRadiusCm}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            cornerRadiusCm: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </Field>
                    <Field label="Color de Borde">
                      <input
                        type="color"
                        value={selectedLayer.stroke}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, { stroke: e.target.value })
                        }
                        className="h-9 w-full cursor-pointer rounded border"
                      />
                    </Field>
                    <Field label="Borde (pt)">
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        step={0.5}
                        value={selectedLayer.strokeWidth}
                        onChange={(e) =>
                          updateLayer(selectedLayer.id, {
                            strokeWidth: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        cardName={name}
        widthCm={widthCm}
        heightCm={heightCm}
        bleedMm={bleedMm}
        isDoubleSided={isDoubleSided}
        frontDoc={frontDoc}
        backDoc={isDoubleSided ? backDoc : null}
        qr={
          linkedQr
            ? { shortUrl: linkedQr.shortUrl, styleConfig: linkedQr.styleConfig }
            : null
        }
      />
    </div>
  );
}
