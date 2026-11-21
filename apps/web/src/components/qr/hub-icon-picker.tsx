"use client";

import * as React from "react";
import type { HubIcon } from "@qira/shared";
import { ChevronDown, Search } from "lucide-react";
import { HUB_ICON_OPTIONS, HubIconGlyph } from "@/components/landing/hub-icons";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Todos", "General", "Gastronomía", "Entretenimiento", "Comercio", "Destacados", "Social"];

export function HubIconPicker({
  value,
  onChange,
}: {
  value: HubIcon;
  onChange: (next: HubIcon) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("Todos");
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const selected = React.useMemo(
    () => HUB_ICON_OPTIONS.find((o) => o.value === value) ?? HUB_ICON_OPTIONS[0]!,
    [value],
  );

  React.useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return HUB_ICON_OPTIONS.filter((opt) => {
      if (category !== "Todos" && opt.category !== category) return false;
      if (!q) return true;
      return opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q);
    });
  }, [query, category]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-sky-400/15 bg-[#08101e]/90 px-2.5 text-left text-xs text-foreground shadow-inner transition-colors hover:border-sky-400/50 cursor-pointer",
          open && "border-primary ring-2 ring-primary/25",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sky-300">
            <HubIconGlyph icon={selected.value} className="size-3.5" />
          </span>
          <span className="truncate font-medium">{selected.label}</span>
        </span>
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-80 overflow-hidden rounded-2xl border border-sky-400/20 bg-[#0c1424] shadow-2xl">
          <div className="border-b border-sky-400/12 p-2.5 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2 left-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar entre ${HUB_ICON_OPTIONS.length} iconos...`}
                autoFocus
                className="h-7 w-full rounded-lg border border-sky-400/15 bg-[#060b14] pr-2 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium transition cursor-pointer",
                    category === cat
                      ? "bg-primary text-white"
                      : "bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto p-2">
            {filtered.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition cursor-pointer",
                    active
                      ? "border-sky-400 bg-primary/20 text-sky-300 ring-1 ring-sky-400"
                      : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-sky-400/35 hover:bg-white/[0.06] hover:text-foreground",
                  )}
                >
                  <HubIconGlyph icon={opt.value} className="size-4" />
                  <span className="w-full truncate text-[10px] font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
