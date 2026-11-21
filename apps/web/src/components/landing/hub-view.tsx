import * as React from "react";
import type { HubButton, HubData } from "@qira/shared";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { HubIconGlyph } from "./hub-icons";

function buildPageBackgroundStyle(hub: HubData): React.CSSProperties {
  const theme = hub.theme;
  const baseBg = theme?.background || "#0f172a";
  const fg = theme?.foreground || "#f8fafc";
  const bgType = theme?.bgType ?? "solid";

  if (bgType === "gradient") {
    const from = theme?.bgGradientFrom || baseBg;
    const to = theme?.bgGradientTo || theme?.accent || "#2563eb";
    const angle = theme?.bgGradientAngle ?? 135;
    const grad =
      theme?.bgGradientType === "radial"
        ? `radial-gradient(circle at 50% 20%, ${from} 0%, ${to} 100%)`
        : `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
    return {
      backgroundColor: baseBg,
      backgroundImage: grad,
      color: fg,
    };
  }

  if (bgType === "image" && theme?.bgImageUrl) {
    return {
      backgroundColor: baseBg,
      backgroundImage: `url("${theme.bgImageUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      color: fg,
    };
  }

  return {
    backgroundColor: baseBg,
    color: fg,
  };
}

function buildButtonSurfaceStyle(
  btn: HubButton,
  defaultAccent: string,
  defaultButtonFont?: string,
): {
  style: React.CSSProperties;
  overlayOpacity: number | null;
} {
  const s = btn.style;
  const fillType = s?.fillType ?? "theme";
  const textColor = s?.textColor || "#ffffff";
  const fontFamily = s?.fontFamily || defaultButtonFont || undefined;

  if (fillType === "solid") {
    return {
      style: {
        backgroundColor: s?.color || defaultAccent,
        color: textColor,
        fontFamily,
      },
      overlayOpacity: null,
    };
  }

  if (fillType === "gradient") {
    const from = s?.gradientFrom || s?.color || defaultAccent;
    const to = s?.gradientTo || "#06b6d4";
    const angle = s?.gradientAngle ?? 90;
    const backgroundImage =
      s?.gradientType === "radial"
        ? `radial-gradient(circle at 50% 50%, ${from} 0%, ${to} 100%)`
        : `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
    return {
      style: {
        backgroundColor: from,
        backgroundImage,
        color: textColor,
        fontFamily,
      },
      overlayOpacity: null,
    };
  }

  if (fillType === "image" && s?.imageUrl) {
    return {
      style: {
        backgroundColor: defaultAccent,
        backgroundImage: `url("${s.imageUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: textColor,
        fontFamily,
      },
      overlayOpacity: s.imageOverlayOpacity ?? 0.45,
    };
  }

  return {
    style: {
      backgroundColor: defaultAccent,
      color: textColor,
      fontFamily,
    },
    overlayOpacity: null,
  };
}

export function HubView({ hub }: { hub: HubData }) {
  const theme = hub.theme;
  const accent = theme?.accent || "#2563eb";
  const pageStyle = buildPageBackgroundStyle(hub);
  const hasBgImage = theme?.bgType === "image" && Boolean(theme?.bgImageUrl);
  const bgOverlay = theme?.bgImageOverlay ?? 0.55;

  return (
    <div
      className="relative flex min-h-screen flex-col justify-between px-4 py-12 transition-colors"
      style={pageStyle}
    >
      {/* Optional dark overlay when a background image is active */}
      {hasBgImage ? (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{ backgroundColor: `rgba(4, 9, 20, ${bgOverlay})` }}
        />
      ) : null}

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center text-center">
        {hub.logoUrl ? (
          <img
            src={hub.logoUrl}
            alt={hub.title}
            className="mb-4 size-24 rounded-full border-2 object-cover shadow-xl"
            style={{ borderColor: accent }}
          />
        ) : (
          <div
            className="mb-4 flex size-20 items-center justify-center rounded-full text-2xl font-bold shadow-xl"
            style={{ backgroundColor: accent, color: "#ffffff" }}
          >
            {hub.title.slice(0, 2).toUpperCase()}
          </div>
        )}

        <h1
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ fontFamily: theme?.titleFont || undefined }}
        >
          {hub.title}
        </h1>

        {hub.description ? (
          <p
            className="mt-2 max-w-sm text-sm opacity-85 sm:text-base"
            style={{ fontFamily: theme?.descriptionFont || undefined }}
          >
            {hub.description}
          </p>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3.5">
          {hub.buttons.map((btn) => {
            const { style: btnStyle, overlayOpacity } = buildButtonSurfaceStyle(
              btn,
              accent,
              theme?.buttonFont,
            );

            return (
              <a
                key={btn.id}
                href={btn.url}
                target={/^(tel|mailto):/i.test(btn.url) ? undefined : "_blank"}
                rel={/^(tel|mailto):/i.test(btn.url) ? undefined : "noopener noreferrer"}
                className="group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/15 px-5 py-4 text-left text-sm font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
                style={btnStyle}
              >
                {overlayOpacity !== null ? (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
                  />
                ) : null}

                <span className="relative z-10 flex min-w-0 items-center gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-black/20 backdrop-blur-xs">
                    <HubIconGlyph icon={btn.icon} className="size-5 shrink-0" />
                  </span>
                  <span className="truncate text-base">{btn.label}</span>
                </span>
                <ArrowUpRight className="relative z-10 size-4 shrink-0 opacity-85 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            );
          })}

          {hub.buttons.length === 0 ? (
            <div className="rounded-2xl border border-current/15 p-6 text-sm opacity-60">
              Aún no hay enlaces configurados.
            </div>
          ) : null}
        </div>
      </div>

      {/* Powered by ALKONPOS Footer */}
      <footer className="relative z-10 mt-12 flex justify-center pt-4">
        <a
          href="https://alkonpos.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/85 uppercase shadow-md backdrop-blur-md transition-all hover:scale-105 hover:border-white/35 hover:bg-black/55 hover:text-white"
        >
          <Sparkles className="size-3.5 text-sky-400 transition-transform group-hover:rotate-12" />
          <span>
            POWERED BY <strong className="font-extrabold text-white">ALKONPOS</strong>
          </span>
        </a>
      </footer>
    </div>
  );
}
