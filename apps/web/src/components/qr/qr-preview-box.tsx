"use client";

import * as React from "react";
import { normalizeQrStyle, TRANSPARENT, type QrStyleConfig } from "@qira/shared";
import { mountQrPreview, renderQrPng, renderQrSvg } from "@/lib/qr-render";
import { cn } from "@/lib/utils";

export function QrPreviewBox({
  style,
  data,
  sizePx = 220,
  className,
}: {
  style: Partial<QrStyleConfig>;
  data: string;
  sizePx?: number;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = React.useRef<Awaited<ReturnType<typeof mountQrPreview>> | null>(null);
  const normalized = React.useMemo(() => normalizeQrStyle(style), [style]);
  const isTransparent =
    normalized.backgroundOptions.color === TRANSPARENT &&
    !normalized.backgroundOptions.gradient;

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    if (handleRef.current) {
      handleRef.current.update(normalized, data);
      return;
    }

    mountQrPreview(el, normalized, data, sizePx)
      .then((h) => {
        if (cancelled) return;
        handleRef.current = h;
      })
      .catch(() => {
        // Ignore transient preview errors while typing
      });

    return () => {
      cancelled = true;
    };
  }, [normalized, data, sizePx]);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-xl border p-3",
        isTransparent
          ? "bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0]"
          : "bg-white",
        className,
      )}
    >
      <div
        ref={containerRef}
        style={{ width: sizePx, height: sizePx }}
        className="flex items-center justify-center [&>canvas]:max-h-full [&>canvas]:max-w-full"
      />
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadQrPng(style: Partial<QrStyleConfig>, data: string, filenameBase: string, sizePx = 2048) {
  const blob = await renderQrPng(style, data, sizePx);
  const safeName = filenameBase.trim().replace(/[^\w-]+/g, "-") || "qr-code";
  triggerDownload(blob, `${safeName}.png`);
}

export async function downloadQrSvg(style: Partial<QrStyleConfig>, data: string, filenameBase: string, sizePx = 1024) {
  const svg = await renderQrSvg(style, data, sizePx);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const safeName = filenameBase.trim().replace(/[^\w-]+/g, "-") || "qr-code";
  triggerDownload(blob, `${safeName}.svg`);
}
