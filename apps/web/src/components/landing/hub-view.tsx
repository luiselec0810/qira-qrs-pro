import * as React from "react";
import type { HubData } from "@qira/shared";
import { ArrowUpRight } from "lucide-react";
import { HubIconGlyph } from "./hub-icons";

export function HubView({ hub }: { hub: HubData }) {
  const bg = hub.theme?.background || "#0f172a";
  const fg = hub.theme?.foreground || "#f8fafc";
  const accent = hub.theme?.accent || "#6366f1";

  return (
    <div
      className="min-h-screen px-4 py-12 transition-colors"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        {hub.logoUrl ? (
          <img
            src={hub.logoUrl}
            alt={hub.title}
            className="mb-4 size-24 rounded-full border-2 object-cover shadow-md"
            style={{ borderColor: accent }}
          />
        ) : (
          <div
            className="mb-4 flex size-20 items-center justify-center rounded-full text-2xl font-bold shadow-md"
            style={{ backgroundColor: accent, color: "#ffffff" }}
          >
            {hub.title.slice(0, 2).toUpperCase()}
          </div>
        )}

        <h1 className="text-2xl font-bold tracking-tight">{hub.title}</h1>
        {hub.description ? (
          <p className="mt-2 max-w-sm text-sm opacity-80">{hub.description}</p>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3">
          {hub.buttons.map((btn) => (
            <a
              key={btn.id}
              href={btn.url}
              target={/^(tel|mailto):/i.test(btn.url) ? undefined : "_blank"}
              rel={/^(tel|mailto):/i.test(btn.url) ? undefined : "noopener noreferrer"}
              className="group flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left text-sm font-semibold shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
              style={{
                backgroundColor: accent,
                color: "#ffffff",
              }}
            >
              <span className="flex items-center gap-3 min-w-0">
                <HubIconGlyph icon={btn.icon} className="size-5 shrink-0" />
                <span className="truncate">{btn.label}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 opacity-75 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          ))}

          {hub.buttons.length === 0 ? (
            <div className="rounded-2xl border border-current/15 p-6 text-sm opacity-60">
              Aún no hay enlaces configurados.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
