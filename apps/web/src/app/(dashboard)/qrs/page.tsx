"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Lock,
  Pause,
  Pencil,
  Play,
  Plus,
  QrCode,
  Route,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { QrDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardFooter, CardHeader, CardTitle, PageHeader } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/interactive";
import { downloadQrPng, downloadQrSvg, QrPreviewBox } from "@/components/qr/qr-preview-box";

const DEST_LABEL: Record<QrDto["destinationType"], string> = {
  url: "URL Externa",
  vcard: "Contacto vCard",
  hub: "Link Hub",
};

export default function QrListPage() {
  const [items, setItems] = React.useState<QrDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<QrDto | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const loadQrs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const qs = params.toString();
      const res = await api.get<{ items: QrDto[] }>(`/qrs${qs ? `?${qs}` : ""}`);
      setItems(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron cargar los códigos QR");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      void loadQrs();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadQrs]);

  const handleCopy = async (qr: QrDto) => {
    try {
      await navigator.clipboard.writeText(qr.shortUrl);
      setCopiedId(qr.id);
      toast.success(`Copiado: ${qr.shortUrl}`);
      setTimeout(() => setCopiedId((curr) => (curr === qr.id ? null : curr)), 1800);
    } catch {
      toast.error("No se pudo copiar la URL");
    }
  };

  const handleToggleStatus = async (qr: QrDto) => {
    const nextStatus = qr.status === "active" ? "paused" : "active";
    try {
      const updated = await api.patch<QrDto>(`/qrs/${qr.id}`, { status: nextStatus });
      setItems((prev) => prev.map((item) => (item.id === qr.id ? updated : item)));
      toast.success(`El QR "${qr.name}" ahora está ${nextStatus === "active" ? "activo" : "en pausa"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/qrs/${deleteTarget.id}`);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success(`Se eliminó "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el código QR");
    } finally {
      setDeleting(false);
    }
  };

  const totalScans = React.useMemo(
    () => items.reduce((sum, item) => sum + item.scanCount, 0),
    [items],
  );
  const activeCount = React.useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items],
  );
  const rulesCount = React.useMemo(
    () => items.reduce((sum, item) => sum + item.rules.length, 0),
    [items],
  );

  return (
    <div className="min-h-screen pb-16">
      <PageHeader
        title="Códigos QR Dinámicos"
        description="Administra URLs cortas dinámicas, estilos visuales, reglas inteligentes de enrutamiento, vCards y Link Hubs."
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" asChild>
              <Link href="/studio">
                <Layers className="size-4" />
                Print Studio
              </Link>
            </Button>
            <Button asChild>
              <Link href="/qrs/new">
                <Plus className="size-4" />
                Crear QR
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Top Hero Row inspired by the warm copper reference dashboard */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="flex flex-wrap items-center justify-between gap-6 pt-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Escaneos Dinámicos Totales
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {totalScans.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-400/30">
                    ↑ {activeCount} QRs activos
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Resolución instantánea &lt;50 ms en Redis • {rulesCount} reglas inteligentes activas
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/analytics">
                    <BarChart3 className="size-3.5" />
                    Analítica
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/batch">Lote CSV</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/qrs/new">
                    <Plus className="size-3.5" />
                    Nuevo QR
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-copper-hero">
            <CardContent className="flex h-full flex-col justify-between gap-4 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground/75">Print Studio 300 DPI</p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    Tarjetas Físicas y Pliegos de Imprenta
                  </h2>
                </div>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-foreground">
                  Sangrado 3 mm
                </span>
              </div>
              <p className="text-xs text-foreground/75">
                Diseña tarjetas doble cara en centímetros y exporta PDFs listos para imprenta con marcas de guillotina de 4 mm.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-[#0a1426]/80" asChild>
                  <Link href="/batch">Lote CSV</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link href="/studio/new">Abrir Studio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Search & Status filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre de QR, slug o URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="paused">Solo en pausa</option>
            </NativeSelect>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="h-72 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <QrCode className="size-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No se encontraron códigos QR</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {search || statusFilter !== "all"
                ? "Ningún código QR coincide con tu búsqueda o filtro de estado actual."
                : "Crea tu primer código QR dinámico con formas personalizadas, degradados, reglas inteligentes de enrutamiento o una vCard / Link Hub alojada."}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {search || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Restablecer filtros
                </Button>
              ) : null}
              <Button asChild>
                <Link href="/qrs/new">
                  <Plus className="size-4" />
                  Crear QR
                </Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((qr) => (
              <Card key={qr.id} className="flex flex-col justify-between overflow-hidden">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">
                          <Link href={`/qrs/${qr.id}`} className="hover:text-primary hover:underline">
                            {qr.name}
                          </Link>
                        </CardTitle>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone={qr.status === "active" ? "success" : "warning"}>
                            {qr.status === "active" ? "Activo" : "En pausa"}
                          </Badge>
                          <Badge tone="default">{DEST_LABEL[qr.destinationType]}</Badge>
                          {qr.hasPin ? (
                            <Badge tone="muted">
                              <Lock className="size-3" />
                              PIN
                            </Badge>
                          ) : null}
                          {qr.rules.length > 0 ? (
                            <Badge tone="muted">
                              <Route className="size-3" />
                              {qr.rules.length} {qr.rules.length === 1 ? "regla" : "reglas"}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold leading-none">{qr.scanCount}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">escaneos</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4">
                      <QrPreviewBox
                        style={qr.styleConfig}
                        data={qr.shortUrl}
                        sizePx={108}
                        className="shrink-0 p-2"
                      />

                      <div className="min-w-0 flex-1 space-y-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">URL Corta (Codificada)</div>
                          <div className="mt-0.5 flex items-center gap-1">
                            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                              {qr.shortUrl}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopy(qr)}
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded border hover:bg-accent"
                              title="Copiar URL corta"
                            >
                              {copiedId === qr.id ? (
                                <Check className="size-3 text-success" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                            <a
                              href={qr.shortUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex size-6 shrink-0 items-center justify-center rounded border hover:bg-accent"
                              title="Abrir URL corta"
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                        </div>

                        <div>
                          <div className="text-muted-foreground">Destino</div>
                          <div className="mt-0.5 truncate font-medium">
                            {qr.destinationType === "url"
                              ? qr.defaultUrl || "—"
                              : qr.landingUrl || `/p/${qr.slug}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => downloadQrPng(qr.styleConfig, qr.shortUrl, qr.name || qr.slug, 2048)}
                          >
                            <Download className="size-3" />
                            PNG
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => downloadQrSvg(qr.styleConfig, qr.shortUrl, qr.name || qr.slug, 1024)}
                          >
                            <Download className="size-3" />
                            SVG
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="flex flex-wrap items-center justify-between gap-1.5 border-t bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/qrs/${qr.id}`}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(qr)}
                      title={qr.status === "active" ? "Pausar QR" : "Activar QR"}
                    >
                      {qr.status === "active" ? (
                        <>
                          <Pause className="size-3.5" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="size-3.5" />
                          Activar
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      asChild
                      title="Abrir en Print Studio"
                    >
                      <Link href={`/studio/new?qrId=${qr.id}`}>
                        <Layers className="size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      asChild
                      title="Analítica"
                    >
                      <Link href={`/analytics?qrId=${qr.id}`}>
                        <BarChart3 className="size-3.5" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      title="Eliminar"
                      onClick={() => setDeleteTarget(qr)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent
          title="¿Eliminar Código QR Dinámico?"
          description={
            deleteTarget
              ? `Esto eliminará permanentemente "${deleteTarget.name}" (/q/${deleteTarget.slug}), así como todas sus reglas de enrutamiento y analítica de escaneos. Los códigos QR impresos con este slug dejarán de funcionar.`
              : undefined
          }
        >
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={deleting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? "Eliminando..." : "Eliminar permanentemente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
