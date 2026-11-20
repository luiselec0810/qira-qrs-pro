"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkQrContrast,
  createQrSchema,
  DEFAULT_QR_STYLE,
  MIN_CONTRAST_RATIO,
  normalizeQrStyle,
  qrBackgroundColors,
  qrForegroundColors,
  updateQrSchema,
  type DestinationType,
  type HubData,
  type LandingData,
  type QrStatus,
  type QrStyleConfig,
  type RoutingRuleInput,
  type UtmParams,
  type VCardData,
} from "@qira/shared";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Info,
  Layers,
  Palette,
  Route,
  Save,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { QrDto } from "@/lib/types";
import { BASE_URL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/interactive";
import { downloadQrPng, downloadQrSvg, QrPreviewBox } from "./qr-preview-box";
import { DestinationTab } from "./destination-tab";
import { DesignTab } from "./design-tab";
import { RulesTab, type EditableRule } from "./rules-tab";
import { isoToDatetimeLocal, SettingsTab } from "./settings-tab";

const DEFAULT_VCARD: VCardData = {
  firstName: "",
  lastName: "",
  title: "",
  company: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  address: "",
  note: "",
};

const DEFAULT_HUB: HubData = {
  title: "",
  description: "",
  theme: {
    background: "#0f172a",
    foreground: "#f8fafc",
    accent: "#6366f1",
  },
  buttons: [],
};

function extractInitialVCard(landing: LandingData | null | undefined): VCardData {
  if (landing?.kind === "vcard") return { ...DEFAULT_VCARD, ...landing.vcard };
  return { ...DEFAULT_VCARD };
}

function extractInitialHub(landing: LandingData | null | undefined): HubData {
  if (landing?.kind === "hub") {
    return {
      ...DEFAULT_HUB,
      ...landing.hub,
      theme: landing.hub.theme ?? DEFAULT_HUB.theme,
      buttons: landing.hub.buttons ?? [],
    };
  }
  return { ...DEFAULT_HUB };
}

function toEditableRules(qr?: QrDto): EditableRule[] {
  if (!qr?.rules?.length) return [];
  return qr.rules.map((r, idx) => ({
    id: r.id || `rule_${idx}`,
    ruleType: r.ruleType,
    conditionData: r.conditionData as unknown as EditableRule["conditionData"],
    targetUrl: r.targetUrl,
    priority: idx + 1,
  }));
}

export function QrEditor({
  mode,
  initialQr,
}: {
  mode: "create" | "edit";
  initialQr?: QrDto;
}) {
  const router = useRouter();
  const [qr, setQr] = React.useState<QrDto | undefined>(initialQr);
  const [name, setName] = React.useState(initialQr?.name ?? "");
  const [status, setStatus] = React.useState<QrStatus>(initialQr?.status ?? "active");
  const [destinationType, setDestinationType] = React.useState<DestinationType>(
    initialQr?.destinationType ?? "url",
  );
  const [defaultUrl, setDefaultUrl] = React.useState(initialQr?.defaultUrl ?? "https://");
  const [vcard, setVCard] = React.useState<VCardData>(() =>
    extractInitialVCard(initialQr?.landingData),
  );
  const [hub, setHub] = React.useState<HubData>(() =>
    extractInitialHub(initialQr?.landingData),
  );
  const [style, setStyle] = React.useState<QrStyleConfig>(() =>
    normalizeQrStyle(initialQr?.styleConfig ?? DEFAULT_QR_STYLE),
  );
  const [rules, setRules] = React.useState<EditableRule[]>(() => toEditableRules(initialQr));
  const [fallbackUrl, setFallbackUrl] = React.useState(initialQr?.fallbackUrl ?? "");
  const [expiresAtLocal, setExpiresAtLocal] = React.useState(() =>
    isoToDatetimeLocal(initialQr?.expiresAt),
  );
  const [timezone, setTimezone] = React.useState(initialQr?.timezone ?? "America/Bogota");
  const [pinInput, setPinInput] = React.useState("");
  const [clearPin, setClearPin] = React.useState(false);
  const [utmParams, setUtmParams] = React.useState<UtmParams>(initialQr?.utmParams ?? {});
  const [webhookUrl, setWebhookUrl] = React.useState(initialQr?.webhookUrl ?? "");

  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // RF-01.1: The QR image ALWAYS encodes only the short URL {BASE_URL}/q/{slug}.
  const encodedShortUrl = qr?.shortUrl ?? `${BASE_URL.replace(/\/+$/, "")}/q/preview`;

  const normalizedStyle = React.useMemo(() => normalizeQrStyle(style), [style]);
  const contrast = React.useMemo(
    () =>
      checkQrContrast(
        qrForegroundColors(normalizedStyle),
        qrBackgroundColors(normalizedStyle),
      ),
    [normalizedStyle],
  );

  const handleCopyShortUrl = async () => {
    try {
      await navigator.clipboard.writeText(encodedShortUrl);
      setCopied(true);
      toast.success("URL corta copiada al portapapeles");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("No se pudo copiar la URL");
    }
  };

  const buildPayload = () => {
    const cleanOptionalUrl = (v: string) => {
      const t = v.trim();
      return t ? t : null;
    };

    let landingData: LandingData | null = null;
    if (destinationType === "vcard") {
      landingData = {
        kind: "vcard",
        vcard: {
          firstName: vcard.firstName.trim(),
          lastName: vcard.lastName?.trim() || undefined,
          title: vcard.title?.trim() || undefined,
          company: vcard.company?.trim() || undefined,
          phone: vcard.phone?.trim() || undefined,
          whatsapp: vcard.whatsapp?.trim() || undefined,
          email: vcard.email?.trim() || undefined,
          website: vcard.website?.trim() || undefined,
          address: vcard.address?.trim() || undefined,
          photoUrl: vcard.photoUrl?.trim() || undefined,
          note: vcard.note?.trim() || undefined,
        },
      };
    } else if (destinationType === "hub") {
      landingData = {
        kind: "hub",
        hub: {
          logoUrl: hub.logoUrl?.trim() || undefined,
          title: hub.title.trim(),
          description: hub.description?.trim() || undefined,
          theme: hub.theme,
          buttons: hub.buttons.map((b) => ({
            id: b.id,
            label: b.label.trim(),
            url: b.url.trim(),
            icon: b.icon,
          })),
        },
      };
    }

    const ruleInputs: RoutingRuleInput[] = rules.map((r, idx) => ({
      ruleType: r.ruleType,
      conditionData: r.conditionData as never,
      targetUrl: r.targetUrl.trim(),
      priority: idx + 1,
    }));

    const basePayload: Record<string, unknown> = {
      name: name.trim(),
      destinationType,
      defaultUrl: destinationType === "url" ? cleanOptionalUrl(defaultUrl) : null,
      landingData,
      fallbackUrl: cleanOptionalUrl(fallbackUrl),
      expiresAt: expiresAtLocal ? new Date(expiresAtLocal).toISOString() : null,
      timezone,
      utmParams: {
        utm_source: utmParams.utm_source?.trim() || undefined,
        utm_medium: utmParams.utm_medium?.trim() || undefined,
        utm_campaign: utmParams.utm_campaign?.trim() || undefined,
      },
      webhookUrl: cleanOptionalUrl(webhookUrl),
      styleConfig: normalizedStyle as unknown as Record<string, unknown>,
      status,
      rules: ruleInputs,
    };

    if (pinInput.trim()) {
      basePayload.pinCode = pinInput.trim();
    } else if (clearPin) {
      basePayload.pinCode = null;
    }

    return basePayload;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const rawPayload = buildPayload();

    const schema = mode === "create" && !qr ? createQrSchema : updateQrSchema;
    const parsed = schema.safeParse(rawPayload);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const fieldPath = firstIssue?.path?.join(".") || "formulario";
      toast.error(`Error de validación (${fieldPath}): ${firstIssue?.message ?? "Entrada inválida"}`);
      return;
    }

    setSaving(true);
    try {
      if (mode === "create" && !qr) {
        const created = await api.post<QrDto>("/qrs", parsed.data);
        setQr(created);
        toast.success(`QR "${created.name}" creado con el slug /q/${created.slug}`);
        router.push(`/qrs/${created.id}`);
      } else if (qr) {
        const updated = await api.patch<QrDto>(`/qrs/${qr.id}`, parsed.data);
        setQr(updated);
        setPinInput("");
        setClearPin(false);
        toast.success("Código QR guardado y caché invalidada");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(err instanceof Error ? err.message : "No se pudo guardar el código QR");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="min-h-screen pb-16">
      <PageHeader
        title={qr ? `Editar QR: ${qr.name}` : "Crear Código QR Dinámico"}
        description={
          qr
            ? `El slug /q/${qr.slug} es permanente — editar destinos o reglas nunca altera el patrón gráfico (RF-01.2).`
            : "Diseña un código QR dinámico con reglas inteligentes de enrutamiento, mini-landings alojadas y soporte de impresión a 300 DPI."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/qrs">
                <ArrowLeft className="size-4" />
                Volver a QRs
              </Link>
            </Button>
            {qr ? (
              <>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/studio/new?qrId=${qr.id}`}>
                    <Layers className="size-4" />
                    Abrir en Print Studio
                  </Link>
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/analytics?qrId=${qr.id}`}>
                    <BarChart3 className="size-4" />
                    Analítica
                  </Link>
                </Button>
              </>
            ) : null}
            <Button type="submit" disabled={saving}>
              <Save className="size-4" />
              {saving ? "Guardando..." : qr ? "Guardar Cambios" : "Crear Código QR"}
            </Button>
          </div>
        }
      />

      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[1fr_360px]">
        {/* Left column: Name bar + Tabs */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 pt-5">
              <div className="min-w-[240px] flex-1">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Nombre de la Campaña QR *
                </label>
                <Input
                  placeholder="Ej. Hablador de Mesa Restaurante — Sede Principal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Estado
                </label>
                <div className="inline-flex rounded-lg border p-0.5">
                  <button
                    type="button"
                    onClick={() => setStatus("active")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      status === "active"
                        ? "bg-success/15 text-success"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("paused")}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      status === "paused"
                        ? "bg-warning/20 text-amber-700"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    En pausa
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="destination" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="destination">
                <Globe className="size-4" />
                Destino
              </TabsTrigger>
              <TabsTrigger value="design">
                <Palette className="size-4" />
                Diseño y Contraste
              </TabsTrigger>
              <TabsTrigger value="rules">
                <Route className="size-4" />
                Reglas Inteligentes ({rules.length})
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings2 className="size-4" />
                Seguridad y Configuración
              </TabsTrigger>
            </TabsList>

            <TabsContent value="destination">
              <DestinationTab
                destinationType={destinationType}
                onDestinationTypeChange={setDestinationType}
                defaultUrl={defaultUrl}
                onDefaultUrlChange={setDefaultUrl}
                vcard={vcard}
                onVCardChange={setVCard}
                hub={hub}
                onHubChange={setHub}
              />
            </TabsContent>

            <TabsContent value="design">
              <DesignTab style={normalizedStyle} onChange={setStyle} />
            </TabsContent>

            <TabsContent value="rules">
              <RulesTab rules={rules} timezone={timezone} onChange={setRules} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab
                qrId={qr?.id}
                name={name}
                onNameChange={setName}
                status={status}
                onStatusChange={setStatus}
                fallbackUrl={fallbackUrl}
                onFallbackUrlChange={setFallbackUrl}
                expiresAtLocal={expiresAtLocal}
                onExpiresAtLocalChange={setExpiresAtLocal}
                timezone={timezone}
                onTimezoneChange={setTimezone}
                hasPin={Boolean(qr?.hasPin)}
                pinInput={pinInput}
                onPinInputChange={setPinInput}
                clearPin={clearPin}
                onClearPinChange={setClearPin}
                utmParams={utmParams}
                onUtmParamsChange={setUtmParams}
                webhookUrl={webhookUrl}
                onWebhookUrlChange={setWebhookUrl}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column: Sticky Live QR Preview */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Vista Previa del QR</CardTitle>
                  <Badge tone={contrast.ok ? "success" : "warning"}>
                    {contrast.ratio}:1 {contrast.ok ? "Óptimo" : "Bajo Contraste"}
                  </Badge>
                </div>
                <CardDescription>
                  Siempre codifica la URL corta de redirección para que la densidad gráfica se mantenga limpia e invariable.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col items-center gap-4">
                <QrPreviewBox style={normalizedStyle} data={encodedShortUrl} sizePx={240} />

                {!contrast.ok ? (
                  <div className="flex w-full items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span>
                      El contraste es inferior a {MIN_CONTRAST_RATIO}:1
                      {contrast.assumedSurface ? " (evaluado sobre papel blanco)" : ""}. Los lectores podrían tener dificultades para escanear este código.
                    </span>
                  </div>
                ) : contrast.assumedSurface ? (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Fondo transparente evaluado sobre papel blanco (#ffffff).
                  </p>
                ) : null}

                {/* Encoded Short URL Box */}
                <div className="w-full space-y-2 rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>URL Corta Codificada (RF-01.1)</span>
                    {qr ? (
                      <Badge tone="default">Slug Permanente</Badge>
                    ) : (
                      <Badge tone="muted">Slug de Vista Previa</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs font-mono">
                      {encodedShortUrl}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={handleCopyShortUrl}
                      title="Copiar URL corta"
                    >
                      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    </Button>
                    {qr ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        asChild
                        title="Probar redirección en nueva pestaña"
                      >
                        <a href={qr.shortUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {!qr ? (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-muted-foreground">
                      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Se asigna un slug alfanumérico único de 6 a 8 caracteres al crear el código, el cual nunca cambia al actualizar reglas o destinos (RF-01.1 y RF-01.2).
                      </span>
                    </div>
                  ) : null}

                  {qr && destinationType !== "url" ? (
                    <div className="border-t pt-2 mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Landing alojada:</span>
                      <Link
                        href={`/p/${qr.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        /p/{qr.slug}
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  ) : null}
                </div>

                {/* High-Res Download Buttons */}
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadQrPng(
                        normalizedStyle,
                        encodedShortUrl,
                        name || qr?.slug || "qr-code",
                        2048,
                      )
                    }
                  >
                    <Download className="size-4" />
                    PNG (2048px)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadQrSvg(
                        normalizedStyle,
                        encodedShortUrl,
                        name || qr?.slug || "qr-code",
                        1024,
                      )
                    }
                  >
                    <Download className="size-4" />
                    SVG Vectorial
                  </Button>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  <Save className="size-4" />
                  {saving ? "Guardando..." : qr ? "Guardar Cambios" : "Crear Código QR"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </form>
  );
}
