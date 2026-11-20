"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, BarChart3, Cpu, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AnalyticsDto, QrDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, PageHeader } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/input";
import {
  DeviceBreakdownCard,
  OsDistributionCard,
  ScansTimeSeriesChart,
  TopCitiesCard,
  TopQrsCard,
} from "@/components/analytics/analytics-charts";
import { cn } from "@/lib/utils";

type RangePreset = "7d" | "30d" | "90d";

function computeDateRange(preset: RangePreset): { from: string; to: string } {
  const now = new Date();
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: fromDate.toISOString(),
    to: now.toISOString(),
  };
}

function AnalyticsDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQrId = searchParams.get("qrId") ?? "";

  const [selectedQrId, setSelectedQrId] = React.useState<string>(initialQrId);
  const [preset, setPreset] = React.useState<RangePreset>("30d");
  const [granularity, setGranularity] = React.useState<"day" | "hour">("day");
  const [qrs, setQrs] = React.useState<QrDto[]>([]);
  const [analytics, setAnalytics] = React.useState<AnalyticsDto | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setSelectedQrId(searchParams.get("qrId") ?? "");
  }, [searchParams]);

  React.useEffect(() => {
    api
      .get<{ items: QrDto[] }>("/qrs")
      .then((res) => setQrs(res.items))
      .catch(() => {
        // Non-fatal if QR list cannot be loaded
      });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { from, to } = computeDateRange(preset);
    const params = new URLSearchParams({
      from,
      to,
      granularity,
    });
    if (selectedQrId) params.set("qrId", selectedQrId);

    api
      .get<AnalyticsDto>(`/analytics?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "No se pudo cargar la analítica");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedQrId, preset, granularity]);

  const handleSelectQr = (qrId: string) => {
    setSelectedQrId(qrId);
    if (qrId) {
      router.push(`/analytics?qrId=${encodeURIComponent(qrId)}`);
    } else {
      router.push("/analytics");
    }
  };

  const selectedQr = qrs.find((q) => q.id === selectedQrId);
  const activeQrCount = qrs.filter((q) => q.status === "active").length;
  const topOs = analytics?.byOs?.[0]?.os ?? "—";

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title={selectedQr ? `Analítica: ${selectedQr.name}` : "Analítica de Escaneos (RF-06.1)"}
        description={
          selectedQr
            ? `Rendimiento en tiempo real para /q/${selectedQr.slug}.`
            : "Telemetría global y por QR, visitantes únicos diarios, distribución por sistema operativo y ciudades principales."
        }
        actions={
          selectedQr ? (
            <Button variant="outline" asChild>
              <Link href={`/qrs/${selectedQr.id}`}>Editar Código QR</Link>
            </Button>
          ) : null
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[240px]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Alcance / Código QR
              </label>
              <NativeSelect
                value={selectedQrId}
                onChange={(e) => handleSelectQr(e.target.value)}
              >
                <option value="">Todos los Códigos QR (Vista Global)</option>
                {qrs.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name} (/q/{q.slug})
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Rango de Fechas
              </label>
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                {(["7d", "30d", "90d"] as RangePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      preset === p
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Últimos {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Granularidad
              </label>
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                {(["day", "hour"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGranularity(g)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition",
                      granularity === g
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Por {g === "day" ? "día" : "hora"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Escaneos Totales</p>
                <p className="mt-1 text-2xl font-bold">
                  {loading ? "…" : (analytics?.totals.scans ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Visitantes Únicos</p>
                <p className="mt-1 text-2xl font-bold">
                  {loading ? "…" : (analytics?.totals.unique ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Users className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {selectedQr ? "Estado del QR" : "Códigos QR Activos"}
                </p>
                <p className="mt-1 text-2xl font-bold capitalize">
                  {selectedQr
                    ? selectedQr.status === "active"
                      ? "Activo"
                      : "En pausa"
                    : `${activeQrCount} / ${qrs.length}`}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <QrCode className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between pt-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sistema Operativo Principal</p>
                <p className="mt-1 text-2xl font-bold">{loading ? "…" : topOs}</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                <Cpu className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time-Series Chart */}
        {analytics ? (
          <>
            <ScansTimeSeriesChart series={analytics.series} granularity={granularity} />

            <div className="grid gap-6 lg:grid-cols-2">
              <OsDistributionCard byOs={analytics.byOs} />
              <DeviceBreakdownCard byDevice={analytics.byDevice} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TopCitiesCard topCities={analytics.topCities} />
              <TopQrsCard topQrs={analytics.topQrs} onSelectQr={handleSelectQr} />
            </div>
          </>
        ) : (
          <Card className="flex h-80 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="size-4 animate-spin" />
              Cargando analítica...
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-6">
          <Card className="h-96 animate-pulse bg-muted/40" />
        </div>
      }
    >
      <AnalyticsDashboardInner />
    </React.Suspense>
  );
}
