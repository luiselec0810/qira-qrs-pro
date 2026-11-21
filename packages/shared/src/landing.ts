import type { VCardData } from "./vcard";

export const HUB_ICONS = [
  "link",
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "email",
  "phone",
  "map",
  "menu",
  "shop",
  "calendar",
  "music",
  "gamepad",
  "gift",
  "star",
  "sparkles",
  "pizza",
  "coffee",
  "beer",
  "utensils",
  "credit-card",
  "ticket",
  "wifi",
  "camera",
  "video",
  "headphones",
  "heart",
  "flame",
  "trophy",
  "car",
  "clock",
  "download",
  "file-text",
] as const;

export type HubIcon = (typeof HUB_ICONS)[number];

export interface HubButtonStyle {
  /** Defaults to "theme" (uses the global hub accent color) */
  fillType?: "theme" | "solid" | "gradient" | "image";
  color?: string;
  gradientType?: "linear" | "radial";
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  imageUrl?: string;
  imageOverlayOpacity?: number;
  textColor?: string;
  fontFamily?: string;
}

export interface HubButton {
  id: string;
  label: string;
  url: string;
  icon: HubIcon;
  style?: HubButtonStyle;
}

export interface HubTheme {
  /** Base solid background color */
  background: string;
  /** Primary text color */
  foreground: string;
  /** Default button fill color */
  accent: string;
  /** Page background mode: solid color, gradient, or full-bleed cover image */
  bgType?: "solid" | "gradient" | "image";
  bgGradientType?: "linear" | "radial";
  bgGradientFrom?: string;
  bgGradientTo?: string;
  bgGradientAngle?: number;
  bgImageUrl?: string;
  /** Dark overlay over background image (0..0.9, default 0.5) for text readability */
  bgImageOverlay?: number;
  /** Independent font families for Title, Description, and Buttons */
  titleFont?: string;
  descriptionFont?: string;
  buttonFont?: string;
}

export interface HubData {
  logoUrl?: string;
  title: string;
  description?: string;
  theme?: HubTheme;
  buttons: HubButton[];
}

/** QrCode.landingData discriminated by QrCode.destinationType (RF-05). */
export type LandingData = { kind: "vcard"; vcard: VCardData } | { kind: "hub"; hub: HubData };

/** Public payload served to /p/{slug}. */
export interface PublicLanding {
  slug: string;
  name: string;
  destinationType: "vcard" | "hub";
  landingData: LandingData;
}
