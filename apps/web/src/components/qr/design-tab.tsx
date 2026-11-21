"use client";

import * as React from "react";
import {
  checkQrContrast,
  MIN_CONTRAST_RATIO,
  normalizeQrStyle,
  qrBackgroundColors,
  qrForegroundColors,
  TRANSPARENT,
  type CornerDotType,
  type CornerSquareType,
  type DotType,
  type ErrorCorrectionLevel,
  type QrFill,
  type QrStyleConfig,
} from "@qira/shared";
import { AlertTriangle, CheckCircle2, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Label, NativeSelect } from "@/components/ui/input";
import { Slider, Switch } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";
import { CornerDotGlyph, CornerSquareGlyph, DotShapeGlyph } from "./shape-previews";

const DOT_SHAPES: Array<{ value: DotType; label: string }> = [
  { value: "square", label: "Clásico" },
  { value: "mosaic", label: "Mosaico" },
  { value: "dots-small", label: "Micro Puntos" },
  { value: "dots", label: "Puntos" },
  { value: "horizontal-lines", label: "Horizontal" },
  { value: "vertical-lines", label: "Vertical" },
  { value: "rounded", label: "Redondeado" },
  { value: "extra-rounded", label: "Extra Redond." },
  { value: "classy", label: "Gota Izq." },
  { value: "classy-rounded", label: "Gota Der." },
  { value: "Shuriken", label: "Cóncavo" },
  { value: "diamond-special", label: "Rombo" },
  { value: "star", label: "Estrella" },
];

const CORNER_SQUARE_SHAPES: Array<{ value: CornerSquareType; label: string }> = [
  { value: "square", label: "Cuadrado" },
  { value: "outpoint", label: "Punta Ext." },
  { value: "leaf-top-right", label: "Hoja Der." },
  { value: "leaf-bottom-left", label: "Hoja Izq." },
  { value: "inpoint", label: "Punta Int." },
  { value: "classy-rounded", label: "Muesca" },
  { value: "dot", label: "Círculo" },
  { value: "extra-rounded", label: "Redondeado" },
  { value: "pinch", label: "Trapecio" },
  { value: "rounded", label: "Suave" },
  { value: "classy", label: "Clásico" },
];

const CORNER_DOT_SHAPES: Array<{ value: CornerDotType; label: string }> = [
  { value: "square", label: "Cuadrado" },
  { value: "outpoint", label: "Punta Ext." },
  { value: "leaf-top-right", label: "Hoja Der." },
  { value: "leaf-bottom-left", label: "Hoja Izq." },
  { value: "classy-rounded", label: "Muesca" },
  { value: "inpoint", label: "Punta Int." },
  { value: "vertical-bars", label: "Barras V." },
  { value: "horizontal-bars", label: "Barras H." },
  { value: "dot", label: "Círculo" },
  { value: "rounded", label: "Redondeado" },
  { value: "pinch", label: "Trapecio" },
  { value: "diamond", label: "Biselado" },
  { value: "star", label: "Estrella" },
];

const EC_LEVELS: Array<{ value: ErrorCorrectionLevel; label: string }> = [
  { value: "L", label: "L — Bajo (7%)" },
  { value: "M", label: "M — Medio (15%)" },
  { value: "Q", label: "Q — Cuartil (25%)" },
  { value: "H", label: "H — Alto (30%)" },
];

function toHexColor(color: string | undefined, fallback = "#111111"): string {
  if (!color || color === TRANSPARENT) return fallback;
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function FillControl({
  title,
  fill,
  onChange,
  disabled = false,
  defaultColor = "#111111",
}: {
  title: string;
  fill: QrFill;
  onChange: (next: QrFill) => void;
  disabled?: boolean;
  defaultColor?: string;
}) {
  const mode: "solid" | "gradient" = fill.gradient ? "gradient" : "solid";
  const stop0 = fill.gradient?.colorStops?.[0]?.color ?? toHexColor(fill.color, defaultColor);
  const stop1 = fill.gradient?.colorStops?.[1]?.color ?? "#4f46e5";
  const gradType = fill.gradient?.type ?? "linear";
  // qr-code-styling takes rotation in radians; display 0..360 degrees in UI.
  const rotationDeg = Math.round(((fill.gradient?.rotation ?? 0) * 180) / Math.PI);

  const setSolid = (color: string) => {
    onChange({ color, gradient: undefined });
  };

  const setGradient = (next: { type?: "linear" | "radial"; deg?: number; c0?: string; c1?: string }) => {
    const deg = next.deg ?? rotationDeg;
    onChange({
      color: next.c0 ?? stop0,
      gradient: {
        type: next.type ?? gradType,
        rotation: (deg * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: next.c0 ?? stop0 },
          { offset: 1, color: next.c1 ?? stop1 },
        ],
      },
    });
  };

  return (
    <div className={cn("rounded-xl border p-4 space-y-3", disabled && "opacity-50 pointer-events-none")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSolid(toHexColor(fill.color ?? stop0, defaultColor))}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition",
              mode === "solid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
            )}
          >
            Sólido
          </button>
          <button
            type="button"
            onClick={() => setGradient({})}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition",
              mode === "gradient" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
            )}
          >
            Degradado
          </button>
        </div>
      </div>

      {mode === "solid" ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={toHexColor(fill.color, defaultColor)}
            onChange={(e) => setSolid(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
          />
          <Input
            value={fill.color ?? defaultColor}
            onChange={(e) => setSolid(e.target.value)}
            placeholder={defaultColor}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo de Degradado">
            <NativeSelect
              value={gradType}
              onChange={(e) => setGradient({ type: e.target.value as "linear" | "radial" })}
            >
              <option value="linear">Lineal</option>
              <option value="radial">Radial</option>
            </NativeSelect>
          </Field>

          <Field label={`Rotación (${rotationDeg}°)`}>
            <div className="flex h-9 items-center">
              <Slider
                min={0}
                max={360}
                step={15}
                value={[rotationDeg]}
                onValueChange={([deg]) => setGradient({ deg: deg ?? 0 })}
              />
            </div>
          </Field>

          <Field label="Color 1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toHexColor(stop0, defaultColor)}
                onChange={(e) => setGradient({ c0: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
              />
              <Input value={stop0} onChange={(e) => setGradient({ c0: e.target.value })} />
            </div>
          </Field>

          <Field label="Color 2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toHexColor(stop1, "#4f46e5")}
                onChange={(e) => setGradient({ c1: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
              />
              <Input value={stop1} onChange={(e) => setGradient({ c1: e.target.value })} />
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}

export function DesignTab({
  style,
  onChange,
}: {
  style: QrStyleConfig;
  onChange: (next: QrStyleConfig) => void;
}) {
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const normalized = React.useMemo(() => normalizeQrStyle(style), [style]);
  const contrast = React.useMemo(
    () => checkQrContrast(qrForegroundColors(normalized), qrBackgroundColors(normalized)),
    [normalized],
  );

  const isTransparentBg =
    normalized.backgroundOptions.color === TRANSPARENT &&
    !normalized.backgroundOptions.gradient;

  const update = (patch: Partial<QrStyleConfig>) => {
    onChange(normalizeQrStyle({ ...normalized, ...patch }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await api.upload(file);
      update({ image: res.url });
      toast.success("Logo central subido — Corrección de errores fijada en H (30%)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contrast Checker Card (RF-01.4) */}
      <Card className={cn(!contrast.ok && "border-warning bg-warning/5")}>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {contrast.ok ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <AlertTriangle className="size-4 text-amber-600" />
              )}
              Verificador de Contraste y Escaneabilidad (RF-01.4)
            </CardTitle>
            <Badge tone={contrast.ok ? "success" : "warning"}>
              Relación de Contraste: {contrast.ratio}:1 (mín. {MIN_CONTRAST_RATIO}:1)
            </Badge>
          </div>
          <CardDescription>
            {contrast.assumedSurface
              ? "Fondo transparente detectado — el contraste se evalúa sobre papel blanco (#ffffff)."
              : "Evalúa el contraste de luminancia en el peor caso entre todos los colores de módulos, esquinas y fondo."}
          </CardDescription>
        </CardHeader>
        {!contrast.ok ? (
          <CardContent>
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">
                  Advertencia de bajo contraste ({contrast.ratio}:1 &lt; {MIN_CONTRAST_RATIO}:1)
                </p>
                <p className="mt-0.5">
                  Las cámaras pueden fallar al decodificar este código QR, especialmente con poca luz o sobre acabados impresos brillantes. Aumenta la diferencia de luminancia entre los módulos y el fondo.
                </p>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {/* Shapes (RF-01.3) */}
      <Card>
        <CardHeader>
          <CardTitle>Formas de Módulos y Esquinas (RF-01.3)</CardTitle>
          <CardDescription>
            Personaliza los módulos de datos, los marcos exteriores y los puntos interiores de las esquinas de forma independiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Body Shape Visual Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Forma del cuerpo ({DOT_SHAPES.length} estilos)</Label>
              <span className="text-xs text-muted-foreground">
                Activo: <strong className="text-primary">{DOT_SHAPES.find((s) => s.value === normalized.dotsOptions.type)?.label}</strong>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
              {DOT_SHAPES.map((shape) => {
                const active = normalized.dotsOptions.type === shape.value;
                return (
                  <button
                    key={shape.value}
                    type="button"
                    title={shape.label}
                    onClick={() =>
                      update({
                        dotsOptions: { ...normalized.dotsOptions, type: shape.value },
                      })
                    }
                    className={cn(
                      "group flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all cursor-pointer",
                      active
                        ? "border-sky-400 bg-primary/20 ring-2 ring-sky-400 shadow-[0_8px_22px_-6px_rgba(37,99,235,0.65)]"
                        : "border-sky-400/15 bg-sky-400/[0.04] hover:border-sky-400/45 hover:bg-sky-400/[0.09]",
                    )}
                  >
                    <div className="flex size-14 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm transition-transform group-hover:scale-105">
                      <DotShapeGlyph type={shape.value} />
                    </div>
                    <span
                      className={cn(
                        "w-full truncate text-center text-[11px] font-medium",
                        active ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {shape.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Corner Frame Visual Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Forma del marco del ojo ({CORNER_SQUARE_SHAPES.length} estilos)</Label>
              <span className="text-xs text-muted-foreground">
                Activo:{" "}
                <strong className="text-primary">
                  {CORNER_SQUARE_SHAPES.find((s) => s.value === normalized.cornersSquareOptions.type)?.label}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
              {CORNER_SQUARE_SHAPES.map((shape) => {
                const active = normalized.cornersSquareOptions.type === shape.value;
                return (
                  <button
                    key={shape.value}
                    type="button"
                    title={shape.label}
                    onClick={() =>
                      update({
                        cornersSquareOptions: {
                          ...normalized.cornersSquareOptions,
                          type: shape.value,
                        },
                      })
                    }
                    className={cn(
                      "group flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all cursor-pointer",
                      active
                        ? "border-sky-400 bg-primary/20 ring-2 ring-sky-400 shadow-[0_8px_22px_-6px_rgba(37,99,235,0.65)]"
                        : "border-sky-400/15 bg-sky-400/[0.04] hover:border-sky-400/45 hover:bg-sky-400/[0.09]",
                    )}
                  >
                    <div className="flex size-14 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm transition-transform group-hover:scale-105">
                      <CornerSquareGlyph type={shape.value} />
                    </div>
                    <span
                      className={cn(
                        "w-full truncate text-center text-[11px] font-medium",
                        active ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {shape.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Corner Dot Visual Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label>Forma del ojo ({CORNER_DOT_SHAPES.length} estilos)</Label>
              <span className="text-xs text-muted-foreground">
                Activo:{" "}
                <strong className="text-primary">
                  {CORNER_DOT_SHAPES.find((s) => s.value === normalized.cornersDotOptions.type)?.label}
                </strong>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
              {CORNER_DOT_SHAPES.map((shape) => {
                const active = normalized.cornersDotOptions.type === shape.value;
                return (
                  <button
                    key={shape.value}
                    type="button"
                    title={shape.label}
                    onClick={() =>
                      update({
                        cornersDotOptions: {
                          ...normalized.cornersDotOptions,
                          type: shape.value,
                        },
                      })
                    }
                    className={cn(
                      "group flex flex-col items-center gap-1.5 rounded-2xl border p-2 transition-all cursor-pointer",
                      active
                        ? "border-sky-400 bg-primary/20 ring-2 ring-sky-400 shadow-[0_8px_22px_-6px_rgba(37,99,235,0.65)]"
                        : "border-sky-400/15 bg-sky-400/[0.04] hover:border-sky-400/45 hover:bg-sky-400/[0.09]",
                    )}
                  >
                    <div className="flex size-14 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm transition-transform group-hover:scale-105">
                      <CornerDotGlyph type={shape.value} />
                    </div>
                    <span
                      className={cn(
                        "w-full truncate text-center text-[11px] font-medium",
                        active ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      {shape.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors & Gradients */}
      <Card>
        <CardHeader>
          <CardTitle>Colores, Degradados y Transparencia</CardTitle>
          <CardDescription>
            Configura colores sólidos o degradados lineales/radiales de 2 paradas para módulos, esquinas y fondo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FillControl
            title="Color / Degradado de Módulos (Puntos)"
            fill={normalized.dotsOptions}
            onChange={(fill) =>
              update({
                dotsOptions: {
                  type: normalized.dotsOptions.type,
                  ...fill,
                },
              })
            }
          />

          <FillControl
            title="Color / Degradado del Marco Exterior de Esquina"
            fill={normalized.cornersSquareOptions}
            onChange={(fill) =>
              update({
                cornersSquareOptions: {
                  type: normalized.cornersSquareOptions.type,
                  ...fill,
                },
              })
            }
          />

          <FillControl
            title="Color / Degradado del Punto Interior de Esquina"
            fill={normalized.cornersDotOptions}
            onChange={(fill) =>
              update({
                cornersDotOptions: {
                  type: normalized.cornersDotOptions.type,
                  ...fill,
                },
              })
            }
          />

          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
            <div>
              <div className="text-sm font-medium">Fondo transparente</div>
              <p className="text-xs text-muted-foreground">
                Fija el fondo en <code>{TRANSPARENT}</code> para integrarlo sin bordes en Print Studio o sobre diseños a color.
              </p>
            </div>
            <Switch
              checked={isTransparentBg}
              onCheckedChange={(checked) => {
                if (checked) {
                  update({ backgroundOptions: { color: TRANSPARENT, gradient: undefined } });
                } else {
                  update({ backgroundOptions: { color: "#ffffff", gradient: undefined } });
                }
              }}
            />
          </div>

          {!isTransparentBg ? (
            <FillControl
              title="Color / Degradado de Fondo"
              fill={normalized.backgroundOptions}
              defaultColor="#ffffff"
              onChange={(fill) => update({ backgroundOptions: fill })}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Central Logo & Error Correction (RF-01.3) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Logo Central y Corrección de Errores</CardTitle>
              <CardDescription>
                Al añadir un logo se bloquea automáticamente la corrección de errores en nivel H (30%) y se despejan los puntos detrás del logo.
              </CardDescription>
            </div>
            {normalized.image ? (
              <Badge tone="default">
                <ShieldCheck className="size-3.5" />
                CE Forzada a H (30%) • hideBackgroundDots: true
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/30 p-4">
            {normalized.image ? (
              <img
                src={normalized.image}
                alt="Logo central del QR"
                className="size-16 rounded-xl border bg-white object-contain p-1.5"
              />
            ) : (
              <div className="flex size-16 items-center justify-center rounded-xl border bg-background text-xs font-medium text-muted-foreground">
                Sin Logo
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent">
                  <Upload className="size-3.5" />
                  {uploadingLogo ? "Subiendo..." : "Subir Logo Central"}
                </span>
              </label>

              {normalized.image ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ image: null })}
                >
                  <X className="size-3.5" />
                  Quitar Logo
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={`Escala del Logo (${Math.round(normalized.imageOptions.imageSize * 100)}%)`}
              hint="Recomendado entre 20% y 40%."
            >
              <div className="flex h-9 items-center">
                <Slider
                  min={0.15}
                  max={0.45}
                  step={0.01}
                  disabled={!normalized.image}
                  value={[normalized.imageOptions.imageSize]}
                  onValueChange={([v]) =>
                    update({
                      imageOptions: {
                        ...normalized.imageOptions,
                        imageSize: v ?? 0.35,
                      },
                    })
                  }
                />
              </div>
            </Field>

            <Field label={`Margen de Zona Silenciosa (${normalized.margin} px)`}>
              <div className="flex h-9 items-center">
                <Slider
                  min={0}
                  max={64}
                  step={4}
                  value={[normalized.margin]}
                  onValueChange={([v]) => update({ margin: v ?? 16 })}
                />
              </div>
            </Field>

            <Field
              label="Nivel de Corrección de Errores"
              hint={
                normalized.image
                  ? "Bloqueado en H (30%) mientras haya un logo central activo."
                  : "Niveles más altos resisten mayor desgaste físico."
              }
            >
              <NativeSelect
                value={normalized.errorCorrectionLevel}
                disabled={Boolean(normalized.image)}
                onChange={(e) =>
                  update({ errorCorrectionLevel: e.target.value as ErrorCorrectionLevel })
                }
              >
                {EC_LEVELS.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
