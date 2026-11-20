"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  History,
  Layers,
  LogOut,
  Moon,
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
      {/* Slim Floating Icon Rail + Label Tooltip */}
      <aside className="sticky top-0 z-30 hidden h-screen w-20 shrink-0 flex-col items-center justify-between border-r border-white/[0.06] bg-[#100c0a]/90 py-6 backdrop-blur-xl md:flex">
        <div className="flex flex-col items-center gap-7">
          {/* Glowing Emerald Emblem */}
          <Link
            href="/qrs"
            title="QIRA QRs Pro"
            className="group relative flex size-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30 transition-all hover:scale-105 hover:bg-emerald-500/25 hover:shadow-[0_0_24px_rgba(52,211,153,0.35)]"
          >
            <Sparkles className="size-5 transition-transform group-hover:rotate-12" />
          </Link>

          {/* Navigation Icons */}
          <nav className="flex flex-col items-center gap-2.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "group relative flex size-11 items-center justify-center rounded-2xl transition-all",
                    active
                      ? "bg-gradient-to-b from-[#f38b4a] to-[#d96528] text-white shadow-[0_8px_22px_-4px_rgba(234,122,61,0.65)] ring-1 ring-white/20"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  <span className="pointer-events-none absolute left-16 z-50 hidden rounded-lg border border-white/10 bg-[#1c1511] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-xl group-hover:block">
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom quick actions */}
        <div className="flex flex-col items-center gap-2.5">
          <Link
            href="/qrs/new"
            title="Nuevo QR Dinámico"
            className="flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/15 hover:text-primary"
          >
            <Plus className="size-4" />
          </Link>
          <Link
            href="/analytics"
            title="Telemetría y Ajustes"
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <Settings className="size-4" />
          </Link>
          <a
            href="http://localhost:4000/health"
            target="_blank"
            rel="noopener noreferrer"
            title="Estado de la API"
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-emerald-400"
          >
            <LogOut className="size-4" />
          </a>
        </div>
      </aside>

      {/* Main Content Area with Top Omnibar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0d0a09]/80 px-6 py-3.5 backdrop-blur-xl">
          {/* Left Omnibar Search + ⌘ + Space Pill */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-1 items-center gap-3 max-w-md rounded-2xl border border-white/[0.07] bg-[#17120f]/90 px-3.5 py-2 shadow-inner"
          >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Buscar QRs dinámicos, tarjetas, lotes..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <span className="shrink-0 rounded-xl border border-white/[0.09] bg-[#241b16] px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-xs">
              ⌘ + Espacio
            </span>
          </form>

          {/* Center pill nav on mobile / quick links on desktop */}
          <div className="hidden items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-[#16110e] p-1 lg:flex">
            {NAV.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all",
                    active
                      ? "bg-[#2a1f18] text-foreground shadow-xs ring-1 ring-primary/30"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right circular actions + Studio User Profile */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/analytics"
              title="Actividad de Escaneos"
              className="flex size-10 items-center justify-center rounded-full border border-white/[0.07] bg-[#18120e] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <History className="size-4" />
            </Link>
            <Link
              href="/qrs"
              title="Notificaciones"
              className="relative flex size-10 items-center justify-center rounded-full border border-white/[0.07] bg-[#18120e] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <Bell className="size-4" />
              <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-primary ring-2 ring-[#18120e]" />
            </Link>
            <span
              title="Tema Obsidiana Cobre Activo"
              className="flex size-10 items-center justify-center rounded-full border border-white/[0.07] bg-[#18120e] text-primary"
            >
              <Moon className="size-4" />
            </span>

            <div className="ml-1 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#17120e] py-1.5 pr-3.5 pl-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#f38b4a] to-[#9a461a] text-xs font-bold text-white shadow-sm">
                QR
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-xs font-semibold text-foreground">Estudio QIRA</div>
                <div className="text-[11px] text-muted-foreground">@estudio_demo</div>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
