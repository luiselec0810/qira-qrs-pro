"use client";

import * as React from "react";
import Konva from "konva";
import { cmToPx, mmToCm, PT_PER_CM, type QrStyleConfig } from "@qira/shared";
import { renderQrImage } from "@/lib/qr-render";
import { loadHtmlImage } from "@/lib/export/render";
import type { CanvasDoc, CanvasLayer } from "./types";

export interface CanvasStageProps {
  doc: CanvasDoc;
  widthCm: number;
  heightCm: number;
  bleedMm: number;
  showGuides: boolean;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, patch: Partial<CanvasLayer>) => void;
  qr: { shortUrl: string; styleConfig: Partial<QrStyleConfig> } | null;
  zoom?: number;
}

/**
 * Interactive Print Studio Canvas powered directly by Konva.Stage.
 * Avoids react-konva's custom React reconciler version lock while keeping
 * full interactive drag, resize, rotation, Transformer and non-printable guides.
 */
export default function CanvasStage({
  doc,
  widthCm,
  heightCm,
  bleedMm,
  showGuides,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  qr,
  zoom = 1,
}: CanvasStageProps) {
  const bleedCm = mmToCm(bleedMm);
  const totalWidthCm = widthCm + 2 * bleedCm;
  const totalHeightCm = heightCm + 2 * bleedCm;

  const basePxPerCm = React.useMemo(() => {
    const maxDim = Math.max(totalWidthCm, totalHeightCm, 1);
    return Math.min(48, Math.max(22, Math.round(540 / maxDim)));
  }, [totalWidthCm, totalHeightCm]);

  const pxPerCm = basePxPerCm * zoom;
  const stageW = Math.round(totalWidthCm * pxPerCm);
  const stageH = Math.round(totalHeightCm * pxPerCm);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<Konva.Stage | null>(null);
  const contentLayerRef = React.useRef<Konva.Layer | null>(null);
  const guidesLayerRef = React.useRef<Konva.Layer | null>(null);

  const onSelectRef = React.useRef(onSelectLayer);
  onSelectRef.current = onSelectLayer;
  const onUpdateRef = React.useRef(onUpdateLayer);
  onUpdateRef.current = onUpdateLayer;

  // Cache loaded HTMLImageElements by URL + rendered QR bitmap
  const [imageMap, setImageMap] = React.useState<Record<string, HTMLImageElement>>({});
  const [qrBitmap, setQrBitmap] = React.useState<HTMLImageElement | null>(null);

  // Load any referenced background or image layer URLs
  React.useEffect(() => {
    const urls = new Set<string>();
    if (doc.background.kind === "image" && doc.background.src) {
      urls.add(doc.background.src);
    }
    for (const layer of doc.layers) {
      if (layer.kind === "image" && layer.src) urls.add(layer.src);
    }
    let cancelled = false;
    for (const url of urls) {
      if (imageMap[url]) continue;
      loadHtmlImage(url)
        .then((img) => {
          if (!cancelled) {
            setImageMap((prev) => (prev[url] ? prev : { ...prev, [url]: img }));
          }
        })
        .catch(() => {
          // Ignore broken image URLs
        });
    }
    return () => {
      cancelled = true;
    };
  }, [doc, imageMap]);

  // Render linked QR code bitmap reactively when QR style or URL changes (RF-03.4)
  const qrStyleKey = React.useMemo(() => (qr ? JSON.stringify(qr.styleConfig) : ""), [qr]);
  const qrShortUrl = qr?.shortUrl ?? "";
  React.useEffect(() => {
    if (!qr || !qrShortUrl) {
      setQrBitmap(null);
      return;
    }
    let cancelled = false;
    const qrLayer = doc.layers.find((l): l is Extract<CanvasLayer, { kind: "qr" }> => l.kind === "qr");
    const sizeCm = qrLayer?.sizeCm || qrLayer?.width || 3;
    const px = Math.max(160, Math.min(1024, cmToPx(sizeCm)));
    renderQrImage(qr.styleConfig, qrShortUrl, px)
      .then((img) => {
        if (!cancelled) setQrBitmap(img);
      })
      .catch(() => {
        if (!cancelled) setQrBitmap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [qr, qrShortUrl, qrStyleKey, doc.layers]);

  // Initialize Konva Stage once on mount
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const stage = new Konva.Stage({
      container: el,
      width: stageW,
      height: stageH,
    });
    const contentLayer = new Konva.Layer();
    const guidesLayer = new Konva.Layer({ listening: false });
    stage.add(contentLayer);
    stage.add(guidesLayer);

    const handleStageDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === stage || e.target.name() === "canvas-bg") {
        onSelectRef.current(null);
      }
    };
    stage.on("mousedown touchstart", handleStageDown);

    stageRef.current = stage;
    contentLayerRef.current = contentLayer;
    guidesLayerRef.current = guidesLayer;

    return () => {
      stage.destroy();
      stageRef.current = null;
      contentLayerRef.current = null;
      guidesLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync stage dimensions, background, layers, selection transformer, and guides
  React.useEffect(() => {
    const stage = stageRef.current;
    const contentLayer = contentLayerRef.current;
    const guidesLayer = guidesLayerRef.current;
    if (!stage || !contentLayer || !guidesLayer) return;

    stage.width(stageW);
    stage.height(stageH);

    contentLayer.destroyChildren();
    guidesLayer.destroyChildren();

    // 1. Background
    const bg = doc.background;
    if (bg.kind === "solid") {
      contentLayer.add(
        new Konva.Rect({
          name: "canvas-bg",
          x: 0,
          y: 0,
          width: stageW,
          height: stageH,
          fill: bg.color,
        }),
      );
    } else if (bg.kind === "gradient") {
      const rad = ((bg.rotation ?? 0) * Math.PI) / 180;
      const cx = stageW / 2;
      const cy = stageH / 2;
      const dx = (Math.cos(rad) * stageW) / 2;
      const dy = (Math.sin(rad) * stageH) / 2;
      if (bg.type === "radial") {
        contentLayer.add(
          new Konva.Rect({
            name: "canvas-bg",
            x: 0,
            y: 0,
            width: stageW,
            height: stageH,
            fillRadialGradientStartPoint: { x: cx, y: cy },
            fillRadialGradientEndPoint: { x: cx, y: cy },
            fillRadialGradientStartRadius: 0,
            fillRadialGradientEndRadius: Math.max(stageW, stageH) / 2,
            fillRadialGradientColorStops: [0, bg.from, 1, bg.to],
          }),
        );
      } else {
        contentLayer.add(
          new Konva.Rect({
            name: "canvas-bg",
            x: 0,
            y: 0,
            width: stageW,
            height: stageH,
            fillLinearGradientStartPoint: { x: cx - dx, y: cy - dy },
            fillLinearGradientEndPoint: { x: cx + dx, y: cy + dy },
            fillLinearGradientColorStops: [0, bg.from, 1, bg.to],
          }),
        );
      }
    } else if (bg.kind === "image" && bg.src && imageMap[bg.src]) {
      const bgImg = imageMap[bg.src]!;
      contentLayer.add(
        new Konva.Image({
          name: "canvas-bg",
          image: bgImg,
          x: 0,
          y: 0,
          width: stageW,
          height: stageH,
        }),
      );
    }

    // 2. Document Layers
    let selectedNode: Konva.Node | null = null;
    let selectedKind: CanvasLayer["kind"] | null = null;

    for (const layer of doc.layers) {
      if (!layer.visible) continue;

      const x = (layer.x + bleedCm) * pxPerCm;
      const y = (layer.y + bleedCm) * pxPerCm;
      const w = layer.width * pxPerCm;
      const h = layer.height * pxPerCm;

      let node: Konva.Shape | null = null;

      if (layer.kind === "rect") {
        const strokePx = layer.strokeWidth > 0 ? (layer.strokeWidth / PT_PER_CM) * pxPerCm : 0;
        node = new Konva.Rect({
          id: layer.id,
          x,
          y,
          width: w,
          height: h,
          rotation: layer.rotation,
          opacity: layer.opacity,
          fill: layer.fill,
          stroke: strokePx > 0 ? layer.stroke : undefined,
          strokeWidth: strokePx,
          cornerRadius: layer.cornerRadiusCm * pxPerCm,
          draggable: !layer.locked,
        });
      } else if (layer.kind === "text") {
        const fontSizePx = (layer.fontSizePt / PT_PER_CM) * pxPerCm;
        const strokePx = layer.strokeWidth > 0 ? (layer.strokeWidth / PT_PER_CM) * pxPerCm : 0;
        const shadowBlurPx = layer.shadowBlur > 0 ? (layer.shadowBlur / PT_PER_CM) * pxPerCm : 0;
        node = new Konva.Text({
          id: layer.id,
          x,
          y,
          width: w,
          height: h,
          rotation: layer.rotation,
          opacity: layer.opacity,
          text: layer.text,
          fontFamily: layer.fontFamily,
          fontSize: fontSizePx,
          fontStyle: layer.fontStyle,
          fill: layer.fill,
          align: layer.align,
          lineHeight: layer.lineHeight,
          stroke: strokePx > 0 ? layer.stroke : undefined,
          strokeWidth: strokePx,
          shadowColor: shadowBlurPx > 0 ? layer.shadowColor : undefined,
          shadowBlur: shadowBlurPx,
          draggable: !layer.locked,
        });
      } else if (layer.kind === "image") {
        const loaded = imageMap[layer.src];
        if (loaded) {
          node = new Konva.Image({
            id: layer.id,
            image: loaded,
            x,
            y,
            width: w,
            height: h,
            rotation: layer.rotation,
            opacity: layer.opacity,
            draggable: !layer.locked,
          });
        }
      } else if (layer.kind === "qr") {
        if (qrBitmap) {
          node = new Konva.Image({
            id: layer.id,
            image: qrBitmap,
            x,
            y,
            width: w,
            height: w,
            rotation: layer.rotation,
            opacity: layer.opacity,
            draggable: !layer.locked,
          });
        } else {
          node = new Konva.Rect({
            id: layer.id,
            x,
            y,
            width: w,
            height: w,
            rotation: layer.rotation,
            opacity: layer.opacity,
            fill: "#f3f4f6",
            stroke: "#9ca3af",
            dash: [4, 4],
            strokeWidth: 1,
            draggable: !layer.locked,
          });
        }
      }

      if (!node) continue;

      node.on("click tap", (e) => {
        e.cancelBubble = true;
        onSelectRef.current(layer.id);
      });

      node.on("dragend", (e) => {
        const target = e.target;
        onUpdateRef.current(layer.id, {
          x: Math.round(((target.x() / pxPerCm) - bleedCm) * 100) / 100,
          y: Math.round(((target.y() / pxPerCm) - bleedCm) * 100) / 100,
        });
      });

      node.on("transformend", (e) => {
        const target = e.target;
        const scaleX = target.scaleX();
        const scaleY = target.scaleY();
        target.scaleX(1);
        target.scaleY(1);

        if (layer.kind === "qr") {
          const scale = Math.max(scaleX, scaleY);
          const nextSize = Math.max(0.8, Math.round(((target.width() * scale) / pxPerCm) * 100) / 100);
          onUpdateRef.current(layer.id, {
            x: Math.round(((target.x() / pxPerCm) - bleedCm) * 100) / 100,
            y: Math.round(((target.y() / pxPerCm) - bleedCm) * 100) / 100,
            width: nextSize,
            height: nextSize,
            sizeCm: nextSize,
            rotation: Math.round(target.rotation() * 10) / 10,
          });
        } else {
          const minW = layer.kind === "text" ? 0.5 : 0.2;
          const minH = layer.kind === "text" ? 0.4 : 0.2;
          onUpdateRef.current(layer.id, {
            x: Math.round(((target.x() / pxPerCm) - bleedCm) * 100) / 100,
            y: Math.round(((target.y() / pxPerCm) - bleedCm) * 100) / 100,
            width: Math.max(minW, Math.round(((target.width() * scaleX) / pxPerCm) * 100) / 100),
            height: Math.max(minH, Math.round(((target.height() * scaleY) / pxPerCm) * 100) / 100),
            rotation: Math.round(target.rotation() * 10) / 10,
          });
        }
      });

      contentLayer.add(node);

      if (layer.id === selectedLayerId && !layer.locked) {
        selectedNode = node;
        selectedKind = layer.kind;
      }
    }

    // 3. Selection Transformer
    if (selectedNode) {
      const tr = new Konva.Transformer({
        nodes: [selectedNode],
        rotateEnabled: true,
        borderStroke: "#ea7a3d",
        anchorStroke: "#ea7a3d",
        anchorFill: "#ffffff",
        anchorSize: 8,
        keepRatio: selectedKind === "qr",
        enabledAnchors:
          selectedKind === "qr"
            ? ["top-left", "top-right", "bottom-left", "bottom-right"]
            : undefined,
        boundBoxFunc: (oldBox, newBox) => {
          if (newBox.width < 10 || newBox.height < 10) return oldBox;
          return newBox;
        },
      });
      contentLayer.add(tr);
    }

    // 4. Non-printable guide overlay (RF-03.3): bleed boundary + cyan dashed trim line
    if (showGuides) {
      if (bleedCm > 0) {
        guidesLayer.add(
          new Konva.Rect({
            x: 0.5,
            y: 0.5,
            width: stageW - 1,
            height: stageH - 1,
            stroke: "#ef4444",
            strokeWidth: 1,
            dash: [4, 4],
          }),
        );
      }
      guidesLayer.add(
        new Konva.Rect({
          x: bleedCm * pxPerCm,
          y: bleedCm * pxPerCm,
          width: widthCm * pxPerCm,
          height: heightCm * pxPerCm,
          stroke: "#06b6d4",
          strokeWidth: 1.25,
          dash: [6, 4],
        }),
      );
      guidesLayer.add(
        new Konva.Line({
          points: [bleedCm * pxPerCm, 0, bleedCm * pxPerCm, bleedCm * pxPerCm],
          stroke: "#06b6d4",
          strokeWidth: 1,
        }),
      );
      guidesLayer.add(
        new Konva.Line({
          points: [0, bleedCm * pxPerCm, bleedCm * pxPerCm, bleedCm * pxPerCm],
          stroke: "#06b6d4",
          strokeWidth: 1,
        }),
      );
    }

    contentLayer.batchDraw();
    guidesLayer.batchDraw();
  }, [
    doc,
    stageW,
    stageH,
    widthCm,
    heightCm,
    bleedCm,
    pxPerCm,
    showGuides,
    selectedLayerId,
    imageMap,
    qrBitmap,
  ]);

  return (
    <div
      className="relative inline-block overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/15"
      style={{
        width: stageW,
        height: stageH,
        backgroundImage:
          "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
        backgroundColor: "#f9fafb",
      }}
    >
      <div ref={containerRef} style={{ width: stageW, height: stageH }} />
    </div>
  );
}
