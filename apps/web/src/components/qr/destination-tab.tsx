"use client";

import * as React from "react";
import type { DestinationType, HubButton, HubData, HubIcon, VCardData } from "@qira/shared";
import {
  ArrowDown,
  ArrowUp,
  Contact,
  Globe,
  LayoutList,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { HUB_ICON_OPTIONS, HubIconGlyph } from "@/components/landing/hub-icons";
import { cn } from "@/lib/utils";

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
    description: "Página multi-enlace o menú exprés con botones personalizados de marca (RF-05.3).",
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

  const updateVCard = <K extends keyof VCardData>(key: K, value: VCardData[K]) => {
    onVCardChange({ ...vcard, [key]: value });
  };

  const updateHub = <K extends keyof HubData>(key: K, value: HubData[K]) => {
    onHubChange({ ...hub, [key]: value });
  };

  const theme = hub.theme ?? {
    background: "#0f172a",
    foreground: "#f8fafc",
    accent: "#6366f1",
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

  const addHubButton = () => {
    const nextBtn: HubButton = {
      id: `btn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: "Visitar nuestro sitio web",
      url: "https://example.com",
      icon: "link",
    };
    updateHub("buttons", [...hub.buttons, nextBtn]);
  };

  const updateHubButton = (index: number, patch: Partial<HubButton>) => {
    const next = hub.buttons.map((b, i) => (i === index ? { ...b, ...patch } : b));
    updateHub("buttons", next);
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
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:border-foreground/20 hover:bg-muted/40",
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
            <CardTitle>Constructor de Link Hub / Menú (RF-05.3)</CardTitle>
            <CardDescription>
              Construye una página móvil con tu logo, colores de tema personalizados y botones de acción con iconos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  placeholder="Café Aurora — Menú Exprés"
                  value={hub.title}
                  onChange={(e) => updateHub("title", e.target.value)}
                />
              </Field>
              <Field label="Subtítulo / Descripción">
                <Input
                  placeholder="Café de especialidad, brunch y enlaces de domicilio"
                  value={hub.description ?? ""}
                  onChange={(e) => updateHub("description", e.target.value || undefined)}
                />
              </Field>
            </div>

            <div className="rounded-xl border p-4 space-y-3">
              <div className="text-sm font-medium">Colores del Tema</div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Fondo">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.background}
                      onChange={(e) =>
                        updateHub("theme", { ...theme, background: e.target.value })
                      }
                      className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                    />
                    <Input
                      value={theme.background}
                      onChange={(e) =>
                        updateHub("theme", { ...theme, background: e.target.value })
                      }
                    />
                  </div>
                </Field>
                <Field label="Primer Plano (Texto)">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.foreground}
                      onChange={(e) =>
                        updateHub("theme", { ...theme, foreground: e.target.value })
                      }
                      className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                    />
                    <Input
                      value={theme.foreground}
                      onChange={(e) =>
                        updateHub("theme", { ...theme, foreground: e.target.value })
                      }
                    />
                  </div>
                </Field>
                <Field label="Acento de Botones">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.accent}
                      onChange={(e) =>
                        updateHub("theme", { ...theme, accent: e.target.value })
                      }
                      className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                    />
                    <Input
                      value={theme.accent}
                      onChange={(e) =>
                        updateHub("theme", { ...theme, accent: e.target.value })
                      }
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Botones de Acción ({hub.buttons.length})</h4>
                  <p className="text-xs text-muted-foreground">
                    Admite enlaces http(s), mailto: y tel:.
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
                  {hub.buttons.map((btn, idx) => (
                    <div
                      key={btn.id}
                      className="grid gap-3 rounded-xl border bg-muted/20 p-3.5 sm:grid-cols-[170px_1fr_1fr_auto]"
                    >
                      <Field label="Icono">
                        <div className="flex items-center gap-2">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-primary">
                            <HubIconGlyph icon={btn.icon} className="size-4" />
                          </div>
                          <NativeSelect
                            value={btn.icon}
                            onChange={(e) =>
                              updateHubButton(idx, { icon: e.target.value as HubIcon })
                            }
                          >
                            {HUB_ICON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                      </Field>

                      <Field label="Etiqueta del Botón">
                        <Input
                          placeholder="Menú Digital"
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
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
