"use client";

import * as React from "react";
import type { QrStatus, UtmParams } from "@qira/shared";
import { KeyRound, Lock, Send, ShieldAlert, Unlock } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, NativeSelect } from "@/components/ui/input";

export const TIMEZONE_OPTIONS = [
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Argentina/Buenos_Aires",
  "Europe/Madrid",
  "UTC",
];

/** Converts an ISO timestamp into a local `YYYY-MM-DDTHH:mm` value for `<input type="datetime-local">`. */
export function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsTab({
  qrId,
  name,
  onNameChange,
  status,
  onStatusChange,
  fallbackUrl,
  onFallbackUrlChange,
  expiresAtLocal,
  onExpiresAtLocalChange,
  timezone,
  onTimezoneChange,
  hasPin,
  pinInput,
  onPinInputChange,
  clearPin,
  onClearPinChange,
  utmParams,
  onUtmParamsChange,
  webhookUrl,
  onWebhookUrlChange,
}: {
  qrId?: string;
  name: string;
  onNameChange: (v: string) => void;
  status: QrStatus;
  onStatusChange: (v: QrStatus) => void;
  fallbackUrl: string;
  onFallbackUrlChange: (v: string) => void;
  expiresAtLocal: string;
  onExpiresAtLocalChange: (v: string) => void;
  timezone: string;
  onTimezoneChange: (v: string) => void;
  hasPin: boolean;
  pinInput: string;
  onPinInputChange: (v: string) => void;
  clearPin: boolean;
  onClearPinChange: (v: boolean) => void;
  utmParams: UtmParams;
  onUtmParamsChange: (v: UtmParams) => void;
  webhookUrl: string;
  onWebhookUrlChange: (v: string) => void;
}) {
  const [testingWebhook, setTestingWebhook] = React.useState(false);

  const handleTestWebhook = async () => {
    if (!qrId) {
      toast.info("Guarda primero el código QR para probar su webhook.");
      return;
    }
    setTestingWebhook(true);
    try {
      const res = await api.post<{ ok: boolean; status: number | null; error?: string }>(
        `/qrs/${qrId}/webhook-test`,
      );
      if (res.ok) {
        toast.success(`El webhook respondió con HTTP ${res.status ?? 200}`);
      } else {
        toast.error(`Error al probar el webhook: ${res.error ?? `HTTP ${res.status ?? "error"}`}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al probar el webhook");
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General & Lifecycle (RF-02.1) */}
      <Card>
        <CardHeader>
          <CardTitle>General y Ciclo de Vida de Campaña (RF-02.1)</CardTitle>
          <CardDescription>
            Controla el estado del QR, fecha de expiración, zona horaria para evaluar horarios y URL de respaldo (Fallback).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del QR *">
            <Input
              placeholder="Hablador de Mesa Menú de Verano"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </Field>

          <Field label="Estado">
            <NativeSelect
              value={status}
              onChange={(e) => onStatusChange(e.target.value as QrStatus)}
            >
              <option value="active">Activo (Redirigiendo)</option>
              <option value="paused">En pausa (Usa URL Fallback / Pantalla de Campaña Finalizada)</option>
            </NativeSelect>
          </Field>

          <Field
            label="Zona Horaria"
            hint="Se utiliza al evaluar reglas de enrutamiento por hora del día y día de la semana."
          >
            <NativeSelect value={timezone} onChange={(e) => onTimezoneChange(e.target.value)}>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field
            label="Fecha y Hora de Expiración"
            hint="Después de este instante, los escaneos redirigen a la URL Fallback o muestran Campaña Finalizada."
          >
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={expiresAtLocal}
                onChange={(e) => onExpiresAtLocalChange(e.target.value)}
              />
              {expiresAtLocal ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onExpiresAtLocalChange("")}
                >
                  Limpiar
                </Button>
              ) : null}
            </div>
          </Field>

          <Field
            label="URL de Respaldo (Fallback)"
            hint="Destino opcional de redirección cuando el QR está en pausa o ha expirado."
            className="sm:col-span-2"
          >
            <Input
              type="url"
              placeholder="https://example.com/campana-finalizada"
              value={fallbackUrl}
              onChange={(e) => onFallbackUrlChange(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {/* PIN Protection (RF-02.2) */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Protección de Acceso con PIN (RF-02.2)</CardTitle>
              <CardDescription>
                Solicita a los visitantes un PIN numérico de 4 a 8 dígitos antes de desbloquear la URL de destino.
              </CardDescription>
            </div>
            {hasPin && !clearPin ? (
              <Badge tone="success">
                <Lock className="size-3.5" />
                PIN Activo
              </Badge>
            ) : clearPin ? (
              <Badge tone="warning">
                <ShieldAlert className="size-3.5" />
                El PIN se eliminará al guardar
              </Badge>
            ) : (
              <Badge tone="muted">
                <Unlock className="size-3.5" />
                Sin PIN
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field
              label={hasPin ? "Definir Nuevo PIN (4–8 dígitos, dejar vacío para mantener el actual)" : "Definir PIN (4–8 dígitos)"}
              hint="Almacenado con hash en el servidor. Los visitantes obtienen una cookie de sesión firmada por 12 horas al desbloquearlo."
            >
              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,8}"
                  maxLength={8}
                  placeholder={hasPin ? "•••• (sin cambios)" : "Ej. 2580"}
                  className="pl-9"
                  value={pinInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                    onPinInputChange(digits);
                    if (digits) onClearPinChange(false);
                  }}
                />
              </div>
            </Field>

            {hasPin ? (
              <Button
                type="button"
                variant={clearPin ? "secondary" : "outline"}
                onClick={() => {
                  const next = !clearPin;
                  onClearPinChange(next);
                  if (next) onPinInputChange("");
                }}
              >
                {clearPin ? "Mantener PIN Actual" : "Quitar Protección PIN"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* UTM Parameters (RF-02.4) */}
      <Card>
        <CardHeader>
          <CardTitle>Parámetros de Campaña UTM (RF-02.4)</CardTitle>
          <CardDescription>
            Se añaden automáticamente a la URL de destino resuelta en cada escaneo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="utm_source">
            <Input
              placeholder="qr_table_tent"
              value={utmParams.utm_source ?? ""}
              onChange={(e) =>
                onUtmParamsChange({
                  ...utmParams,
                  utm_source: e.target.value || undefined,
                })
              }
            />
          </Field>

          <Field label="utm_medium">
            <Input
              placeholder="print"
              value={utmParams.utm_medium ?? ""}
              onChange={(e) =>
                onUtmParamsChange({
                  ...utmParams,
                  utm_medium: e.target.value || undefined,
                })
              }
            />
          </Field>

          <Field label="utm_campaign">
            <Input
              placeholder="summer_2025"
              value={utmParams.utm_campaign ?? ""}
              onChange={(e) =>
                onUtmParamsChange({
                  ...utmParams,
                  utm_campaign: e.target.value || undefined,
                })
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* Webhook Integration (RF-02.5) */}
      <Card>
        <CardHeader>
          <CardTitle>Notificación por Webhook (RF-02.5 — n8n / Zapier / Make)</CardTitle>
          <CardDescription>
            Envía una petición <code>POST</code> asíncrona no bloqueante con metadatos del escaneo (<code>qr.scanned</code>) cada vez que se escanea este QR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field
              label="URL del Endpoint Webhook (POST)"
              hint="Guarda los cambios antes de probar si acabas de actualizar la URL del webhook."
              className="min-w-[260px] flex-1"
            >
              <Input
                type="url"
                placeholder="https://n8n.example.com/webhook/qr-scans"
                value={webhookUrl}
                onChange={(e) => onWebhookUrlChange(e.target.value)}
              />
            </Field>

            {qrId ? (
              <Button
                type="button"
                variant="outline"
                disabled={testingWebhook || !webhookUrl.trim()}
                onClick={handleTestWebhook}
              >
                <Send className="size-4" />
                {testingWebhook ? "Enviando..." : "Probar Webhook"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
