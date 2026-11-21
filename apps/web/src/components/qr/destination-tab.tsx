"use client";

import * as React from "react";
import type {
  DestinationType,
  HubButton,
  HubButtonStyle,
  HubData,
  HubIcon,
  HubTheme,
  VCardData,
} from "@qira/shared";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Contact,
  Eye,
  Globe,
  ImagePlus,
  LayoutList,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Slider } from "@/components/ui/interactive";
import { HubView } from "@/components/landing/hub-view";
import { FontPicker } from "@/components/studio/font-picker";
import { STUDIO_FONT_OPTIONS } from "@/components/studio/types";
import { HubIconPicker } from "./hub-icon-picker";
import { cn } from "@/lib/utils";

const DEFAULT_FONT = STUDIO_FONT_OPTIONS[0]?.value ?? "Inter, system-ui, sans-serif";

const DESTINATION_CARDS: Array<{
  type: DestinationType;
  title: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: "url",
    title: "URL Externa",
    description: "Redirige directamente a cualquier sitio web, tienda, PDF o enlace profundo.",
    Icon: Globe,
  },
  {
    type: "vcard",
    title: "Contacto vCard",
    description: "Página de contacto móvil alojada con descarga directa de archivo .vcf (RF-05.2).",
    Icon: Contact,
  },
  {
    type: "hub",
    title: "Link Hub / Menú",
    description: "Página multi-enlace o menú exprés con fondos, tipografías y botones personalizados (RF-05.3).",
    Icon: LayoutList,
  },
];

export function DestinationTab({
  destinationType,
  onDestinationTypeChange,
  defaultUrl,
  onDefaultUrlChange,
  vcard,
  onVCardChange,
  hub,
  onHubChange,
}: {
  destinationType: DestinationType;
  onDestinationTypeChange: (next: DestinationType) => void;
  defaultUrl: string;
  onDefaultUrlChange: (next: string) => void;
  vcard: VCardData;
  onVCardChange: (next: VCardData) => void;
  hub: HubData;
  onHubChange: (next: HubData) => void;
}) {
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [uploadingBgImg, setUploadingBgImg] = React.useState(false);
  const [uploadingBtnIdx, setUploadingBtnIdx] = React.useState<number | null>(null);
  const [expandedBtnId, setExpandedBtnId] = React.useState<string | null>(null);
  const [showLivePreview, setShowLivePreview] = React.useState(true);

  const updateVCard = <K extends keyof VCardData>(key: K, value: VCardData[K]) => {
    onVCardChange({ ...vcard, [key]: value });
  };

  const updateHub = <K extends keyof HubData>(key: K, value: HubData[K]) => {
    onHubChange({ ...hub, [key]: value });
  };

  const theme: HubTheme = {
    background: "#0f172a",
    foreground: "#f8fafc",
    accent: "#2563eb",
    bgType: "solid",
    bgGradientType: "linear",
    bgGradientFrom: "#0f172a",
    bgGradientTo: "#1d4ed8",
    bgGradientAngle: 135,
    bgImageOverlay: 0.55,
    titleFont: DEFAULT_FONT,
    descriptionFont: DEFAULT_FONT,
    buttonFont: DEFAULT_FONT,
    ...hub.theme,
  };

  const patchTheme = (patch: Partial<HubTheme>) => {
    updateHub("theme", { ...theme, ...patch });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await api.upload(file);
      updateVCard("photoUrl", res.url);
      toast.success("Foto subida correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleHubLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await api.upload(file);
      updateHub("logoUrl", res.url);
      toast.success("Logo subido correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHubBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingBgImg(true);
    try {
      const res = await api.upload(file);
      patchTheme({ bgType: "image", bgImageUrl: res.url });
      toast.success("Imagen de fondo del Link Hub aplicada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen de fondo");
    } finally {
      setUploadingBgImg(false);
    }
  };

  const handleButtonBgImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingBtnIdx(index);
    try {
      const res = await api.upload(file);
      const current = hub.buttons[index];
      if (current) {
        updateHubButton(index, {
          style: {
            ...current.style,
            fillType: "image",
            imageUrl: res.url,
          },
        });
      }
      toast.success("Imagen de fondo aplicada al botón");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir imagen del botón");
    } finally {
      setUploadingBtnIdx(null);
    }
  };

  const addHubButton = () => {
    const nextBtn: HubButton = {
      id: `btn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: "Nuestra Carta Digital",
      url: "https://alkonpos.com",
      icon: "menu",
      style: {
        fillType: "theme",
      },
    };
    updateHub("buttons", [...hub.buttons, nextBtn]);
    setExpandedBtnId(nextBtn.id);
  };

  const updateHubButton = (index: number, patch: Partial<HubButton>) => {
    const next = hub.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b));
    updateHub("buttons", next);
  };

  const patchButtonStyle = (index: number, patch: Partial<HubButtonStyle>) => {
    const btn = hub.buttons[index];
    if (!btn) return;
    updateHubButton(index, {
      style: {
        fillType: "theme",
        ...btn.style,
        ...patch,
      },
    });
  };

  const removeHubButton = (index: number) => {
    updateHub(
      "buttons",
      hub.buttons.filter((_, i) => i !== index),
    );
  };

  const moveHubButton = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= hub.buttons.length) return;
    const copy = [...hub.buttons];
    const [item] = copy.splice(index, 1);
    if (!item) return;
    copy.splice(target, 0, item);
    updateHub("buttons", copy);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Destino</CardTitle>
          <CardDescription>
            Elige adónde irán los usuarios al escanear cuando ninguna regla inteligente modifique el destino predeterminado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {DESTINATION_CARDS.map(({ type, title, description, Icon }) => {
              const active = destinationType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onDestinationTypeChange(type)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer",
                    active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                      : "hover:border-sky-400/35 hover:bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="font-semibold text-sm">{title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {destinationType === "url" ? (
        <Card>
          <CardHeader>
            <CardTitle>URL Externa de Destino</CardTitle>
            <CardDescription>
              Puedes actualizar esta URL en cualquier momento sin cambiar el código QR impreso (RF-01.2).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="URL de Destino *"
              hint="Solo se permiten protocolos HTTP y HTTPS (RNF-03)."
            >
              <Input
                type="url"
                placeholder="https://example.com/promo"
                value={defaultUrl}
                onChange={(e) => onDefaultUrlChange(e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {destinationType === "vcard" ? (
        <Card>
          <CardHeader>
            <CardTitle>Contacto Digital vCard (RF-05.2)</CardTitle>
            <CardDescription>
              Al escanear se muestra una tarjeta de perfil móvil en <code>/p/&lt;slug&gt;</code> con acciones rápidas y descarga de contacto <code>.vcf</code> en un toque.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/30 p-4">
              {vcard.photoUrl ? (
                <img
                  src={vcard.photoUrl}
                  alt={vcard.firstName || "Avatar"}
                  className="size-16 rounded-xl border object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-xl border bg-background text-sm font-semibold text-muted-foreground">
                  Foto
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent">
                    <Upload className="size-3.5" />
                    {uploadingPhoto ? "Subiendo..." : "Subir Foto"}
                  </span>
                </label>
                {vcard.photoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateVCard("photoUrl", undefined)}
                  >
                    <X className="size-3.5" />
                    Quitar
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre *">
                <Input
                  placeholder="María"
                  value={vcard.firstName}
                  onChange={(e) => updateVCard("firstName", e.target.value)}
                />
              </Field>
              <Field label="Apellido">
                <Input
                  placeholder="Gómez"
                  value={vcard.lastName ?? ""}
                  onChange={(e) => updateVCard("lastName", e.target.value || undefined)}
                />
              </Field>
              <Field label="Cargo / Puesto">
                <Input
                  placeholder="Directora Creativa"
                  value={vcard.title ?? ""}
                  onChange={(e) => updateVCard("title", e.target.value || undefined)}
                />
              </Field>
              <Field label="Empresa / Organización">
                <Input
                  placeholder="QIRA Studio"
                  value={vcard.company ?? ""}
                  onChange={(e) => updateVCard("company", e.target.value || undefined)}
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  placeholder="+57 300 123 4567"
                  value={vcard.phone ?? ""}
                  onChange={(e) => updateVCard("phone", e.target.value || undefined)}
                />
              </Field>
              <Field label="WhatsApp" hint="Genera un botón directo de chat wa.me.">
                <Input
                  placeholder="+57 300 123 4567"
                  value={vcard.whatsapp ?? ""}
                  onChange={(e) => updateVCard("whatsapp", e.target.value || undefined)}
                />
              </Field>
              <Field label="Correo electrónico">
                <Input
                  type="email"
                  placeholder="maria@example.com"
                  value={vcard.email ?? ""}
                  onChange={(e) => updateVCard("email", e.target.value || undefined)}
                />
              </Field>
              <Field label="Sitio web">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={vcard.website ?? ""}
                  onChange={(e) => updateVCard("website", e.target.value || undefined)}
                />
              </Field>
            </div>

            <Field label="Dirección">
              <Input
                placeholder="Calle 85 # 15-32, Bogotá, Colombia"
                value={vcard.address ?? ""}
                onChange={(e) => updateVCard("address", e.target.value || undefined)}
              />
            </Field>

            <Field label="Biografía / Nota">
              <Textarea
                placeholder="Breve biografía o notas de contacto incluidas en la vCard..."
                value={vcard.note ?? ""}
                onChange={(e) => updateVCard("note", e.target.value || undefined)}
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {destinationType === "hub" ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Constructor de Link Hub / Menú (RF-05.3)</CardTitle>
                <CardDescription>
                  Personaliza logo, fondo (sólido, degradado o imagen), tipografías independientes y botones con iconos, degradados o imágenes de fondo.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLivePreview((p) => !p)}
              >
                <Eye className="size-3.5" />
                {showLivePreview ? "Ocultar Vista Móvil" : "Ver Vista Móvil"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 1. Logo + Title & Description */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/30 p-4">
              {hub.logoUrl ? (
                <img
                  src={hub.logoUrl}
                  alt={hub.title || "Logo del Hub"}
                  className="size-16 rounded-full border object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full border bg-background text-xs font-semibold text-muted-foreground">
                  Logo
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={handleHubLogoUpload}
                    disabled={uploadingLogo}
                  />
                  <span className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent">
                    <Upload className="size-3.5" />
                    {uploadingLogo ? "Subiendo..." : "Subir Logo"}
                  </span>
                </label>
                {hub.logoUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateHub("logoUrl", undefined)}
                  >
                    <X className="size-3.5" />
                    Quitar
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Título de la Página *">
                <Input
                  placeholder="Menu Jaguar Burger"
                  value={hub.title}
                  onChange={(e) => updateHub("title", e.target.value)}
                />
              </Field>
              <Field label="Subtítulo / Descripción">
                <Input
                  placeholder="Explora todo lo que te ofrece la selva"
                  value={hub.description ?? ""}
                  onChange={(e) => updateHub("description", e.target.value || undefined)}
                />
              </Field>
            </div>

            {/* 2. Typography Selector for Title, Description & Buttons */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Type className="size-4 text-sky-400" />
                Tipografías del Link Hub (38 estilos con vista previa)
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tipografía del Título">
                  <FontPicker
                    value={theme.titleFont || DEFAULT_FONT}
                    onChange={(titleFont) => patchTheme({ titleFont })}
                  />
                </Field>
                <Field label="Tipografía de la Descripción">
                  <FontPicker
                    value={theme.descriptionFont || DEFAULT_FONT}
                    onChange={(descriptionFont) => patchTheme({ descriptionFont })}
                  />
                </Field>
                <Field label="Tipografía de los Botones">
                  <FontPicker
                    value={theme.buttonFont || DEFAULT_FONT}
                    onChange={(buttonFont) => patchTheme({ buttonFont })}
                  />
                </Field>
              </div>
            </div>

            {/* 3. Background & Theme Colors (Solid, Gradient, or Cover Image) */}
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Palette className="size-4 text-sky-400" />
                  Fondo de la Página y Colores del Tema
                </div>

                <div className="inline-flex rounded-xl border border-sky-400/15 bg-[#08101e] p-1 text-xs">
                  {(
                    [
                      { id: "solid", label: "Color Sólido" },
                      { id: "gradient", label: "Degradado" },
                      { id: "image", label: "Imagen de Fondo" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => patchTheme({ bgType: mode.id })}
                      className={cn(
                        "rounded-lg px-3 py-1 font-medium transition cursor-pointer",
                        (theme.bgType ?? "solid") === mode.id
                          ? "bg-primary text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {(theme.bgType ?? "solid") === "solid" && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Color de Fondo">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.background}
                        onChange={(e) => patchTheme({ background: e.target.value })}
                        className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                      />
                      <Input
                        value={theme.background}
                        onChange={(e) => patchTheme({ background: e.target.value })}
                      />
                    </div>
                  </Field>
                  <Field label="Color de Texto (Primer Plano)">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.foreground}
                        onChange={(e) => patchTheme({ foreground: e.target.value })}
                        className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                      />
                      <Input
                        value={theme.foreground}
                        onChange={(e) => patchTheme({ foreground: e.target.value })}
                      />
                    </div>
                  </Field>
                  <Field label="Acento de Botones Predeterminado">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.accent}
                        onChange={(e) => patchTheme({ accent: e.target.value })}
                        className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                      />
                      <Input
                        value={theme.accent}
                        onChange={(e) => patchTheme({ accent: e.target.value })}
                      />
                    </div>
                  </Field>
                </div>
              )}

              {theme.bgType === "gradient" && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Field label="Tipo de Degradado">
                      <NativeSelect
                        value={theme.bgGradientType ?? "linear"}
                        onChange={(e) =>
                          patchTheme({ bgGradientType: e.target.value as "linear" | "radial" })
                        }
                      >
                        <option value="linear">Lineal</option>
                        <option value="radial">Radial</option>
                      </NativeSelect>
                    </Field>

                    <Field label="Color Inicial">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.bgGradientFrom || theme.background}
                          onChange={(e) => patchTheme({ bgGradientFrom: e.target.value })}
                          className="h-9 w-11 cursor-pointer rounded border bg-background p-1"
                        />
                        <Input
                          value={theme.bgGradientFrom || theme.background}
                          onChange={(e) => patchTheme({ bgGradientFrom: e.target.value })}
                        />
                      </div>
                    </Field>

                    <Field label="Color Final">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.bgGradientTo || theme.accent}
                          onChange={(e) => patchTheme({ bgGradientTo: e.target.value })}
                          className="h-9 w-11 cursor-pointer rounded border bg-background p-1"
                        />
                        <Input
                          value={theme.bgGradientTo || theme.accent}
                          onChange={(e) => patchTheme({ bgGradientTo: e.target.value })}
                        />
                      </div>
                    </Field>

                    <Field label={`Ángulo (${theme.bgGradientAngle ?? 135}°)`}>
                      <div className="flex h-9 items-center">
                        <Slider
                          min={0}
                          max={360}
                          step={15}
                          value={[theme.bgGradientAngle ?? 135]}
                          onValueChange={([deg]) => patchTheme({ bgGradientAngle: deg ?? 135 })}
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Color de Texto (Primer Plano)">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.foreground}
                          onChange={(e) => patchTheme({ foreground: e.target.value })}
                          className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                        />
                        <Input
                          value={theme.foreground}
                          onChange={(e) => patchTheme({ foreground: e.target.value })}
                        />
                      </div>
                    </Field>
                    <Field label="Acento de Botones Predeterminado">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.accent}
                          onChange={(e) => patchTheme({ accent: e.target.value })}
                          className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                        />
                        <Input
                          value={theme.accent}
                          onChange={(e) => patchTheme({ accent: e.target.value })}
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              )}

              {theme.bgType === "image" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/20 p-3.5">
                    {theme.bgImageUrl ? (
                      <img
                        src={theme.bgImageUrl}
                        alt="Fondo del Link Hub"
                        className="h-20 w-32 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-32 items-center justify-center rounded-lg border bg-background text-xs text-muted-foreground">
                        Sin Imagen
                      </div>
                    )}

                    <div className="flex-1 space-y-2 min-w-[220px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="sr-only"
                            onChange={handleHubBgImageUpload}
                            disabled={uploadingBgImg}
                          />
                          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent">
                            <ImagePlus className="size-3.5 text-sky-400" />
                            {uploadingBgImg ? "Subiendo..." : "Subir Imagen de Fondo"}
                          </span>
                        </label>
                        {theme.bgImageUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => patchTheme({ bgImageUrl: undefined })}
                          >
                            <X className="size-3.5" />
                            Quitar
                          </Button>
                        ) : null}
                      </div>

                      <Input
                        placeholder="O pega una URL de imagen https://..."
                        value={theme.bgImageUrl ?? ""}
                        onChange={(e) => patchTheme({ bgImageUrl: e.target.value || undefined })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field
                      label={`Oscurecer Fondo (${Math.round((theme.bgImageOverlay ?? 0.55) * 100)}%)`}
                      hint="Mejora la lectura del título sobre fotos."
                    >
                      <div className="flex h-9 items-center">
                        <Slider
                          min={0}
                          max={0.9}
                          step={0.05}
                          value={[theme.bgImageOverlay ?? 0.55]}
                          onValueChange={([v]) => patchTheme({ bgImageOverlay: v ?? 0.55 })}
                        />
                      </div>
                    </Field>

                    <Field label="Color de Texto (Primer Plano)">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.foreground}
                          onChange={(e) => patchTheme({ foreground: e.target.value })}
                          className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                        />
                        <Input
                          value={theme.foreground}
                          onChange={(e) => patchTheme({ foreground: e.target.value })}
                        />
                      </div>
                    </Field>

                    <Field label="Acento de Botones Predeterminado">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={theme.accent}
                          onChange={(e) => patchTheme({ accent: e.target.value })}
                          className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                        />
                        <Input
                          value={theme.accent}
                          onChange={(e) => patchTheme({ accent: e.target.value })}
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Action Buttons with Rich Icon Picker & Per-Button Background/Gradient/Image */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Botones de Acción ({hub.buttons.length})</h4>
                  <p className="text-xs text-muted-foreground">
                    Elige entre 37 iconos y personaliza el fondo de cada botón con color sólido, degradado o imagen.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addHubButton}>
                  <Plus className="size-4" />
                  Añadir Botón
                </Button>
              </div>

              {hub.buttons.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aún no hay botones. Haz clic en &ldquo;Añadir Botón&rdquo; para crear tu primer enlace.
                </div>
              ) : (
                <div className="space-y-3">
                  {hub.buttons.map((btn, idx) => {
                    const isExpanded = expandedBtnId === btn.id;
                    const bStyle: HubButtonStyle = {
                      fillType: "theme",
                      color: theme.accent,
                      gradientType: "linear",
                      gradientFrom: theme.accent,
                      gradientTo: "#06b6d4",
                      gradientAngle: 90,
                      imageOverlayOpacity: 0.45,
                      textColor: "#ffffff",
                      ...btn.style,
                    };

                    return (
                      <div
                        key={btn.id}
                        className="rounded-2xl border border-sky-400/15 bg-muted/20 p-3.5 space-y-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-[190px_1fr_1fr_auto]">
                          <Field label="Icono">
                            <HubIconPicker
                              value={btn.icon}
                              onChange={(icon: HubIcon) => updateHubButton(idx, { icon })}
                            />
                          </Field>

                          <Field label="Etiqueta del Botón">
                            <Input
                              placeholder="Nuestra Carta"
                              value={btn.label}
                              onChange={(e) => updateHubButton(idx, { label: e.target.value })}
                            />
                          </Field>

                          <Field label="URL de Destino">
                            <Input
                              placeholder="https://... o tel:+57..."
                              value={btn.url}
                              onChange={(e) => updateHubButton(idx, { url: e.target.value })}
                            />
                          </Field>

                          <div className="flex items-end gap-1">
                            <Button
                              type="button"
                              variant={isExpanded ? "default" : "outline"}
                              size="sm"
                              className="h-9 px-2.5 text-xs"
                              title="Personalizar estilo, degradado o imagen del botón"
                              onClick={() => setExpandedBtnId(isExpanded ? null : btn.id)}
                            >
                              <Palette className="size-3.5" />
                              Estilo
                              {isExpanded ? (
                                <ChevronUp className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Mover arriba"
                              disabled={idx === 0}
                              onClick={() => moveHubButton(idx, -1)}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Mover abajo"
                              disabled={idx === hub.buttons.length - 1}
                              onClick={() => moveHubButton(idx, 1)}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Eliminar botón"
                              onClick={() => removeHubButton(idx)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Collapsible Per-Button Style Panel */}
                        {isExpanded && (
                          <div className="rounded-xl border border-sky-400/15 bg-[#08101e]/85 p-3.5 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-sky-300">
                                Apariencia del Botón &ldquo;{btn.label}&rdquo;
                              </span>

                              <div className="inline-flex rounded-lg border border-sky-400/15 bg-[#0c1424] p-0.5 text-[11px]">
                                {(
                                  [
                                    { id: "theme", label: "Usar Tema" },
                                    { id: "solid", label: "Sólido" },
                                    { id: "gradient", label: "Degradado" },
                                    { id: "image", label: "Imagen" },
                                  ] as const
                                ).map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => patchButtonStyle(idx, { fillType: m.id })}
                                    className={cn(
                                      "rounded-md px-2.5 py-1 font-medium transition cursor-pointer",
                                      (bStyle.fillType ?? "theme") === m.id
                                        ? "bg-primary text-white"
                                        : "text-muted-foreground hover:text-foreground",
                                    )}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {bStyle.fillType === "solid" && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Color de Fondo del Botón">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={bStyle.color || theme.accent}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { color: e.target.value })
                                      }
                                      className="h-9 w-11 cursor-pointer rounded border bg-background p-1"
                                    />
                                    <Input
                                      value={bStyle.color || theme.accent}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { color: e.target.value })
                                      }
                                    />
                                  </div>
                                </Field>

                                <Field label="Color del Texto e Icono">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={bStyle.textColor || "#ffffff"}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { textColor: e.target.value })
                                      }
                                      className="h-9 w-11 cursor-pointer rounded border bg-background p-1"
                                    />
                                    <Input
                                      value={bStyle.textColor || "#ffffff"}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { textColor: e.target.value })
                                      }
                                    />
                                  </div>
                                </Field>
                              </div>
                            )}

                            {bStyle.fillType === "gradient" && (
                              <div className="grid gap-3 sm:grid-cols-4">
                                <Field label="Color 1">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={bStyle.gradientFrom || theme.accent}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { gradientFrom: e.target.value })
                                      }
                                      className="h-9 w-10 cursor-pointer rounded border bg-background p-1"
                                    />
                                    <Input
                                      value={bStyle.gradientFrom || theme.accent}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { gradientFrom: e.target.value })
                                      }
                                    />
                                  </div>
                                </Field>

                                <Field label="Color 2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={bStyle.gradientTo || "#06b6d4"}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { gradientTo: e.target.value })
                                      }
                                      className="h-9 w-10 cursor-pointer rounded border bg-background p-1"
                                    />
                                    <Input
                                      value={bStyle.gradientTo || "#06b6d4"}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { gradientTo: e.target.value })
                                      }
                                    />
                                  </div>
                                </Field>

                                <Field label={`Ángulo (${bStyle.gradientAngle ?? 90}°)`}>
                                  <div className="flex h-9 items-center">
                                    <Slider
                                      min={0}
                                      max={360}
                                      step={15}
                                      value={[bStyle.gradientAngle ?? 90]}
                                      onValueChange={([deg]) =>
                                        patchButtonStyle(idx, { gradientAngle: deg ?? 90 })
                                      }
                                    />
                                  </div>
                                </Field>

                                <Field label="Color de Texto">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={bStyle.textColor || "#ffffff"}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { textColor: e.target.value })
                                      }
                                      className="h-9 w-10 cursor-pointer rounded border bg-background p-1"
                                    />
                                    <Input
                                      value={bStyle.textColor || "#ffffff"}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, { textColor: e.target.value })
                                      }
                                    />
                                  </div>
                                </Field>
                              </div>
                            )}

                            {bStyle.fillType === "image" && (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  {bStyle.imageUrl ? (
                                    <img
                                      src={bStyle.imageUrl}
                                      alt={btn.label}
                                      className="h-12 w-24 rounded-lg border object-cover"
                                    />
                                  ) : null}

                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                      className="sr-only"
                                      onChange={(e) => handleButtonBgImageUpload(idx, e)}
                                      disabled={uploadingBtnIdx === idx}
                                    />
                                    <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-medium shadow-xs hover:bg-accent">
                                      <ImagePlus className="size-3.5 text-sky-400" />
                                      {uploadingBtnIdx === idx
                                        ? "Subiendo..."
                                        : "Subir Imagen del Botón"}
                                    </span>
                                  </label>

                                  <div className="flex-1 min-w-[180px]">
                                    <Input
                                      placeholder="O pega URL https://... de la imagen del botón"
                                      value={bStyle.imageUrl ?? ""}
                                      onChange={(e) =>
                                        patchButtonStyle(idx, {
                                          imageUrl: e.target.value || undefined,
                                        })
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Field
                                    label={`Velo Oscuro (${Math.round((bStyle.imageOverlayOpacity ?? 0.45) * 100)}%)`}
                                  >
                                    <div className="flex h-9 items-center">
                                      <Slider
                                        min={0}
                                        max={0.85}
                                        step={0.05}
                                        value={[bStyle.imageOverlayOpacity ?? 0.45]}
                                        onValueChange={([v]) =>
                                          patchButtonStyle(idx, { imageOverlayOpacity: v ?? 0.45 })
                                        }
                                      />
                                    </div>
                                  </Field>

                                  <Field label="Color de Texto">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={bStyle.textColor || "#ffffff"}
                                        onChange={(e) =>
                                          patchButtonStyle(idx, { textColor: e.target.value })
                                        }
                                        className="h-9 w-10 cursor-pointer rounded border bg-background p-1"
                                      />
                                      <Input
                                        value={bStyle.textColor || "#ffffff"}
                                        onChange={(e) =>
                                          patchButtonStyle(idx, { textColor: e.target.value })
                                        }
                                      />
                                    </div>
                                  </Field>
                                </div>
                              </div>
                            )}

                            <div className="grid gap-3 sm:grid-cols-2 pt-1">
                              <Field label="Tipografía Específica de este Botón (opcional)">
                                <FontPicker
                                  value={bStyle.fontFamily || theme.buttonFont || DEFAULT_FONT}
                                  onChange={(fontFamily) =>
                                    patchButtonStyle(idx, { fontFamily })
                                  }
                                />
                              </Field>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Interactive Mobile Live Preview inside the Editor */}
            {showLivePreview && (
              <div className="rounded-2xl border border-sky-400/20 bg-[#070d18] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
                    <Sparkles className="size-3.5" />
                    Vista Previa Móvil en Tiempo Real (incluye sello POWERED BY ALKONPOS)
                  </div>
                  <Badge tone="muted">Simulador /p/&lt;slug&gt;</Badge>
                </div>

                <div className="mx-auto max-w-md overflow-hidden rounded-3xl border-4 border-slate-800 shadow-2xl">
                  <div className="max-h-[560px] overflow-y-auto">
                    <HubView hub={{ ...hub, theme }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
