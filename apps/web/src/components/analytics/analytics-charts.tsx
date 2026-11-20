"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsDto } from "@/lib/types";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_COLORS = ["#ea7a3d", "#34d399", "#f59e0b", "#fb7185", "#a78bfa", "#38bdf8"];

export function ScansTimeSeriesChart({
  series,
  granularity,
}: {
  series: AnalyticsDto["series"];
  granularity: "day" | "hour";
}) {
  const formatBucket = (bucket: string) => {
    if (granularity === "hour") {
      const d = new Date(bucket);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      }
    }
    return bucket.slice(0, 10);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Escaneos en el Tiempo (Escaneos Totales vs. Visitantes Únicos)</CardTitle>
            <CardDescription className="mt-1">
              Serie temporal {granularity === "hour" ? "por hora" : "diaria"} completada con ceros. Visitantes únicos deduplicados mediante hash diario con sal.
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-foreground/90">
              <span className="size-2.5 rounded-sm bg-[#ea7a3d]" />
              Escaneos Totales
            </span>
            <span className="flex items-center gap-1.5 text-foreground/90">
              <span className="size-2.5 rounded-sm bg-[#34d399]" />
              Visitantes Únicos
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea7a3d" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#ea7a3d" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 214, 180, 0.07)" />
              <XAxis
                dataKey="bucket"
                tickFormatter={formatBucket}
                tick={{ fontSize: 12, fill: "#9e8c7e" }}
                axisLine={{ stroke: "rgba(255, 214, 180, 0.1)" }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#9e8c7e" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(label) => formatBucket(String(label))}
                contentStyle={{
                  backgroundColor: "#f7efe8",
                  color: "#16110e",
                  borderRadius: "1rem",
                  border: "none",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
                itemStyle={{ color: "#16110e" }}
              />
              <Area
                type="monotone"
                dataKey="scans"
                name="Escaneos Totales"
                stroke="#f48c4c"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorScans)"
              />
              <Area
                type="monotone"
                dataKey="unique"
                name="Visitantes Únicos"
                stroke="#34d399"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUnique)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function OsDistributionCard({ byOs }: { byOs: AnalyticsDto["byOs"] }) {
  const total = byOs.reduce((acc, item) => acc + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Sistema Operativo</CardTitle>
        <CardDescription>Desglose de escaneos según el sistema operativo detectado.</CardDescription>
      </CardHeader>
      <CardContent>
        {byOs.length === 0 || total === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se registraron datos de sistemas operativos en este periodo.
          </div>
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byOs}
                    dataKey="count"
                    nameKey="os"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={4}
                    stroke="rgba(22,17,14,0.9)"
                  >
                    {byOs.map((entry, idx) => (
                      <Cell key={entry.os} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1c1511",
                      color: "#f7efe8",
                      borderRadius: "0.75rem",
                      border: "1px solid rgba(255,214,180,0.15)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {byOs.map((item, idx) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                const color = CHART_COLORS[idx % CHART_COLORS.length];
                return (
                  <div key={item.os} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {item.os}
                      </span>
                      <span className="text-muted-foreground">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DeviceBreakdownCard({ byDevice }: { byDevice: AnalyticsDto["byDevice"] }) {
  const total = byDevice.reduce((acc, item) => acc + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipo de Dispositivo</CardTitle>
        <CardDescription>Distribución de escaneos entre móvil, tablet y escritorio.</CardDescription>
      </CardHeader>
      <CardContent>
        {byDevice.length === 0 || total === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se registraron datos de dispositivos en este periodo.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {byDevice.map((item, idx) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              const color = CHART_COLORS[idx % CHART_COLORS.length];
              return (
                <div key={item.deviceType} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{item.deviceType}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                      {item.count} escaneos • {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TopCitiesCard({ topCities }: { topCities: AnalyticsDto["topCities"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ciudades Principales</CardTitle>
        <CardDescription>Principales ubicaciones geográficas donde se originaron los escaneos.</CardDescription>
      </CardHeader>
      <CardContent>
        {topCities.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay datos de ciudades registrados.
          </div>
        ) : (
          <div className="space-y-2.5">
            {topCities.map((c, idx) => (
              <div
                key={`${c.city}-${c.country ?? ""}-${idx}`}
                className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#1e1713]/75 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-xs font-semibold text-primary">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{c.city || "Desconocida"}</div>
                    <div className="text-xs text-muted-foreground">{c.country || "Global"}</div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-400">+{c.count} escaneos</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TopQrsCard({
  topQrs,
  onSelectQr,
}: {
  topQrs: AnalyticsDto["topQrs"];
  onSelectQr: (qrId: string) => void;
}) {
  return (
    <Card className="surface-copper-hero">
      <CardHeader>
        <CardTitle>Códigos QR con Mejor Rendimiento</CardTitle>
        <CardDescription className="text-foreground/70">
          Códigos QR más escaneados en el rango de fechas seleccionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topQrs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No hay ranking de escaneos disponible para este rango.
          </div>
        ) : (
          <div className="space-y-2.5">
            {topQrs.map((q) => (
              <div
                key={q.qrId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.09] bg-[#150f0c]/80 px-4 py-3 backdrop-blur-md"
              >
                <div className="min-w-0">
                  <Link
                    href={`/qrs/${q.qrId}`}
                    className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {q.name}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge tone="muted">/q/{q.slug}</Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-400/25">
                    ↑ {q.scans}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectQr(q.qrId)}
                    className="rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-primary hover:text-white"
                  >
                    Inspeccionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
