import { extractVariables } from "@qira/shared";

export type CanvasBackground =
  | { kind: "none" }
  | { kind: "solid"; color: string }
  | {
      kind: "gradient";
      type: "linear" | "radial";
      rotation: number;
      from: string;
      to: string;
    }
  | { kind: "image"; src: string };

export interface BaseLayer {
  id: string;
  name: string;
  /** Position in cm relative to the trim box top-left (0,0). */
  x: number;
  y: number;
  /** Size in cm. */
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
}

export interface TextLayer extends BaseLayer {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSizePt: number;
  fontStyle: "normal" | "bold" | "italic";
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
}

export interface ImageLayer extends BaseLayer {
  kind: "image";
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface QrLayer extends BaseLayer {
  kind: "qr";
  /** Square size in cm (width === height === sizeCm). */
  sizeCm: number;
}

export interface RectLayer extends BaseLayer {
  kind: "rect";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadiusCm: number;
}

export type CanvasLayer = TextLayer | ImageLayer | QrLayer | RectLayer;

export interface CanvasDoc {
  version: 1;
  background: CanvasBackground;
  layers: CanvasLayer[];
}

export interface StudioFontOption {
  label: string;
  value: string;
  category: "Sans Serif" | "Serif" | "Display" | "Manuscrita" | "Monoespaciada";
}

export const STUDIO_FONT_OPTIONS: readonly StudioFontOption[] = [
  // Sans Serif (14)
  { label: "Inter", value: "Inter, system-ui, sans-serif", category: "Sans Serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif", category: "Sans Serif" },
  { label: "Poppins", value: "'Poppins', sans-serif", category: "Sans Serif" },
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif", category: "Sans Serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif", category: "Sans Serif" },
  { label: "Outfit", value: "'Outfit', sans-serif", category: "Sans Serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif", category: "Sans Serif" },
  { label: "Raleway", value: "'Raleway', sans-serif", category: "Sans Serif" },
  { label: "Oswald", value: "'Oswald', sans-serif", category: "Sans Serif" },
  { label: "Nunito", value: "'Nunito', sans-serif", category: "Sans Serif" },
  { label: "Rubik", value: "'Rubik', sans-serif", category: "Sans Serif" },
  { label: "Work Sans", value: "'Work Sans', sans-serif", category: "Sans Serif" },
  { label: "Quicksand", value: "'Quicksand', sans-serif", category: "Sans Serif" },
  { label: "Josefin Sans", value: "'Josefin Sans', sans-serif", category: "Sans Serif" },
  { label: "Ubuntu", value: "'Ubuntu', sans-serif", category: "Sans Serif" },
  { label: "Lato", value: "'Lato', sans-serif", category: "Sans Serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif", category: "Sans Serif" },
  { label: "Roboto", value: "'Roboto', sans-serif", category: "Sans Serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif", category: "Sans Serif" },

  // Serif & Editorial (9)
  { label: "Playfair Display", value: "'Playfair Display', serif", category: "Serif" },
  { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif", category: "Serif" },
  { label: "Cinzel", value: "'Cinzel', serif", category: "Serif" },
  { label: "Merriweather", value: "'Merriweather', serif", category: "Serif" },
  { label: "Lora", value: "'Lora', serif", category: "Serif" },
  { label: "Libre Baskerville", value: "'Libre Baskerville', serif", category: "Serif" },
  { label: "EB Garamond", value: "'EB Garamond', serif", category: "Serif" },
  { label: "Georgia", value: "Georgia, serif", category: "Serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif", category: "Serif" },

  // Display & Titulares (7)
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif", category: "Display" },
  { label: "Anton", value: "'Anton', sans-serif", category: "Display" },
  { label: "Abril Fatface", value: "'Abril Fatface', serif", category: "Display" },
  { label: "Righteous", value: "'Righteous', sans-serif", category: "Display" },
  { label: "Orbitron", value: "'Orbitron', sans-serif", category: "Display" },
  { label: "Permanent Marker", value: "'Permanent Marker', cursive", category: "Display" },
  { label: "Impact", value: "Impact, sans-serif", category: "Display" },

  // Manuscrita / Script (5)
  { label: "Pacifico", value: "'Pacifico', cursive", category: "Manuscrita" },
  { label: "Dancing Script", value: "'Dancing Script', cursive", category: "Manuscrita" },
  { label: "Great Vibes", value: "'Great Vibes', cursive", category: "Manuscrita" },
  { label: "Caveat", value: "'Caveat', cursive", category: "Manuscrita" },
  { label: "Satisfy", value: "'Satisfy', cursive", category: "Manuscrita" },

  // Monoespaciada (3)
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace", category: "Monoespaciada" },
  { label: "Fira Code", value: "'Fira Code', monospace", category: "Monoespaciada" },
  { label: "Courier New", value: "'Courier New', Courier, monospace", category: "Monoespaciada" },
] as const;

export const STUDIO_FONTS = STUDIO_FONT_OPTIONS.map((f) => f.value);

export const GOOGLE_FONTS_STYLESHEET_URL =
  "https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Anton&family=Bebas+Neue&family=Caveat:wght@500;700&family=Cinzel:wght@500;700&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500&family=DM+Sans:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@500;700&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Fira+Code:wght@400;600&family=Great+Vibes&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&family=Josefin+Sans:ital,wght@0,400;0,700;1,400&family=Lato:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,400;0,700;1,400&family=Nunito:ital,wght@0,400;0,700;1,400&family=Open+Sans:ital,wght@0,400;0,700;1,400&family=Orbitron:wght@500;700&family=Oswald:wght@400;700&family=Outfit:wght@400;700&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Plus+Jakarta+Sans:ital,wght@0,400;0,700;1,400&family=Poppins:ital,wght@0,400;0,700;1,400&family=Quicksand:wght@500;700&family=Raleway:ital,wght@0,400;0,700;1,400&family=Righteous&family=Roboto:ital,wght@0,400;0,700;1,400&family=Rubik:ital,wght@0,400;0,700;1,400&family=Satisfy&family=Space+Grotesk:wght@400;700&family=Ubuntu:ital,wght@0,400;0,700;1,400&family=Work+Sans:ital,wght@0,400;0,700;1,400&display=swap";

export function makeLayerId(prefix = "lyr"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultCanvasDoc(
  widthCm: number,
  heightCm: number,
  hasQr = true,
): CanvasDoc {
  const layers: CanvasLayer[] = [];
  const qrSize = Math.round(Math.min(widthCm, heightCm) * 0.45 * 10) / 10;

  layers.push({
    id: makeLayerId("txt"),
    name: "Título",
    kind: "text",
    x: Math.round(widthCm * 0.1 * 100) / 100,
    y: Math.round(heightCm * 0.1 * 100) / 100,
    width: Math.round(widthCm * 0.8 * 100) / 100,
    height: Math.max(1.2, Math.round(heightCm * 0.18 * 100) / 100),
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: "Escanea el menú",
    fontFamily: STUDIO_FONTS[0] ?? "Inter, system-ui, sans-serif",
    fontSizePt: widthCm >= 10 ? 22 : 14,
    fontStyle: "bold",
    fill: "#111827",
    align: "center",
    lineHeight: 1.2,
    stroke: "#000000",
    strokeWidth: 0,
    shadowColor: "#000000",
    shadowBlur: 0,
  });

  if (hasQr) {
    layers.push({
      id: makeLayerId("qr"),
      name: "QR Dinámico",
      kind: "qr",
      x: Math.round(((widthCm - qrSize) / 2) * 100) / 100,
      y: Math.round((heightCm * 0.34) * 100) / 100,
      width: qrSize,
      height: qrSize,
      sizeCm: qrSize,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
    });
  }

  return {
    version: 1,
    background: { kind: "solid", color: "#ffffff" },
    layers,
  };
}

export function normalizeCanvasDoc(
  raw: unknown,
  widthCm: number,
  heightCm: number,
  hasQr = true,
): CanvasDoc {
  if (
    raw &&
    typeof raw === "object" &&
    "version" in raw &&
    (raw as { version: unknown }).version === 1 &&
    "layers" in raw &&
    Array.isArray((raw as { layers: unknown }).layers)
  ) {
    const candidate = raw as CanvasDoc;
    return {
      version: 1,
      background: candidate.background ?? { kind: "solid", color: "#ffffff" },
      layers: candidate.layers,
    };
  }
  return createDefaultCanvasDoc(widthCm, heightCm, hasQr);
}

/** Collects unique `{{variable}}` names across front and back text layers (RF-04.2). */
export function collectCanvasVariables(
  front: CanvasDoc | null | undefined,
  back?: CanvasDoc | null | undefined,
): string[] {
  const texts: string[] = [];
  for (const doc of [front, back]) {
    if (!doc) continue;
    for (const layer of doc.layers) {
      if (layer.kind === "text") {
        texts.push(layer.text);
      }
    }
  }
  return extractVariables(...texts);
}
