"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { STUDIO_FONT_OPTIONS, type StudioFontOption } from "./types";
import { cn } from "@/lib/utils";

const CATEGORIES: StudioFontOption["category"][] = [
  "Sans Serif",
  "Serif",
  "Display",
  "Manuscrita",
  "Monoespaciada",
];

/**
 * Custom rich typography selector that renders each font item in its own live typeface,
 * with search and category grouping.
 */
export function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextFontFamily: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string>("Todas");
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const selected = React.useMemo(
    () =>
      STUDIO_FONT_OPTIONS.find((f) => f.value === value) ?? {
        label: value.split(",")[0]?.replace(/'/g, "") || "Inter",
        value,
        category: "Sans Serif" as const,
      },
    [value],
  );

  React.useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return STUDIO_FONT_OPTIONS.filter((f) => {
      if (activeCategory !== "Todas" && f.category !== activeCategory) return false;
      if (!q) return true;
      return f.label.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
    });
  }, [query, activeCategory]);

  const handleSelect = (fontValue: string) => {
    onChange(fontValue);
    setOpen(false);
    // Trigger browser font load so Konva canvas re-renders once the webfont is ready
    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.load(`16px ${fontValue}`).catch(() => {});
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-sky-400/[0.15] bg-[#08101e]/90 px-3.5 text-left text-sm text-foreground shadow-inner transition-colors hover:border-sky-400/50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25 cursor-pointer",
          open && "border-primary ring-[3px] ring-primary/20",
        )}
      >
        <div className="min-w-0 flex-1 truncate">
          <span
            className="text-base leading-none text-foreground"
            style={{ fontFamily: selected.value }}
          >
            {selected.label}
          </span>
          <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            {selected.category}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 left-0 z-50 mt-1.5 flex max-h-96 flex-col overflow-hidden rounded-2xl border border-sky-400/20 bg-[#0c1424] shadow-2xl">
          {/* Search input */}
          <div className="border-b border-sky-400/12 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar entre ${STUDIO_FONT_OPTIONS.length} tipografías...`}
                autoFocus
                className="h-8 w-full rounded-lg border border-sky-400/15 bg-[#060b14] pr-2.5 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
            </div>

            {/* Category filter pills */}
            <div className="mt-2 flex flex-wrap gap-1">
              {["Todas", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium transition cursor-pointer",
                    activeCategory === cat
                      ? "bg-primary text-white"
                      : "bg-white/[0.05] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground",
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Font list with live style preview */}
          <div className="overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No se encontraron tipografías para &ldquo;{query}&rdquo;
              </div>
            ) : (
              filtered.map((font) => {
                const isSelected = font.value === value;
                return (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => handleSelect(font.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                        : "text-foreground hover:bg-white/[0.07]",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-[17px] leading-snug"
                        style={{ fontFamily: font.value }}
                      >
                        {font.label}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{font.category}</span>
                        <span>•</span>
                        <span
                          className="truncate text-foreground/75"
                          style={{ fontFamily: font.value }}
                        >
                          Abc 123 — QIRA Studio
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
