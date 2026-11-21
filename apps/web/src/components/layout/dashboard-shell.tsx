"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronRight,
  History,
  Layers,
  Plus,
  QrCode,
  Search,
  Settings,
  Sheet,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/qrs", label: "Códigos QR", icon: QrCode },
  { href: "/studio", label: "Print Studio", icon: Layers },
  { href: "/batch", label: "Lotes CSV", icon: Sheet },
  { href: "/analytics", label: "Analítica", icon: BarChart3 },
];

const QUICK_ACTIONS = [
  { href: "/qrs/new", label: "Crear nuevo QR", icon: Plus },
  { href: "/studio/new", label: "Nueva tarjeta 300 DPI", icon: Layers },
  { href: "/batch", label: "Generar lote CSV", icon: Sheet },
  { href: "/analytics", label: "Ver telemetría", icon: Activity },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [quickSearch, setQuickSearch] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/qrs");
  };

  return (
    <div className="flex min-h-screen bg-transparent text-foreground">
      {/* Left Petrol-Navy Sidebar with Full Labels, Profile & Quick Actions (Reference layout) */}
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-sky-400/10 bg-[#080e1a]/95 px-4 py-5 backdrop-blur-xl md:flex">
        <div className="space-y-6">
          {/* Brand Header */}
          <Link href="/qrs" className="group flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400/20 via-blue-500/20 to-cyan-500/20 text-sky-400 ring-1 ring-sky-400/35 shadow-[0_0_24px_rgba(56,189,248,0.22)]">
              <Sparkles className="size-5 transition-transform group-hover:rotate-12" />
            </div>
            <div>
              <div className="text-base font-bold tracking-wider text-foreground">
                QIRA <span className="text-sky-400">PRO</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/70">
                QR &amp; Print Intelligence
              </div>
            </div>
          </Link>

          {/* Primary Navigation */}
          <nav className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-[#1d4ed8] to-[#1e40af] text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.65)] ring-1 ring-sky-300/25"
                      : "text-muted-foreground hover:bg-[#111d33] hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4", active ? "text-sky-200" : "text-muted-foreground")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Card + Quick Actions matching reference sidebar */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-sky-400/12 bg-[#0c1628] p-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white shadow-sm">
              QR
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-semibold text-foreground">Estudio QIRA</div>
              <div className="truncate text-[11px] text-muted-foreground">Production Studio</div>
            </div>
            <Link
              href="/analytics"
              title="Ajustes y Telemetría"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
            >
              <Settings className="size-3.5" />
            </Link>
          </div>

          <div className="border-t border-sky-400/10 pt-3">
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Acciones Rápidas
            </div>
            <div className="space-y-0.5">
              {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-[#111d33] hover:text-sky-300"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-3.5 text-sky-400/80" />
                    {label}
                  </span>
                  <ChevronRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Top Omnibar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-sky-400/10 bg-[#060b14]/85 px-6 py-3 backdrop-blur-xl">
          {/* Left Omnibar Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex max-w-md flex-1 items-center gap-3 rounded-xl border border-sky-400/15 bg-[#0c1526]/90 px-3.5 py-1.5 shadow-inner"
          >
            <Search className="size-4 shrink-0 text-sky-400/70" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Buscar QRs dinámicos, tarjetas, lotes..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <span className="shrink-0 rounded-lg border border-sky-400/15 bg-[#122038] px-2 py-0.5 text-[11px] font-medium text-sky-200/80">
              ⌘ + K
            </span>
          </form>

          {/* Mobile navigation pills */}
          <div className="flex items-center gap-1 rounded-xl border border-sky-400/15 bg-[#0c1424] p-1 md:hidden">
            {NAV.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-[#1d4ed8] text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right Action Pills */}
          <div className="flex items-center gap-2">
            <Link
              href="/analytics"
              title="Actividad de Escaneos"
              className="flex size-9 items-center justify-center rounded-xl border border-sky-400/15 bg-[#0c1526] text-muted-foreground transition-colors hover:border-sky-400/40 hover:text-sky-300"
            >
              <History className="size-4" />
            </Link>
            <Link
              href="/qrs"
              title="Estado del Sistema"
              className="relative flex size-9 items-center justify-center rounded-xl border border-sky-400/15 bg-[#0c1526] text-muted-foreground transition-colors hover:border-sky-400/40 hover:text-sky-300"
            >
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-sky-400 ring-2 ring-[#0c1526]" />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
