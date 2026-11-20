import type { VCardData } from "./vcard";

export type HubIcon =
  | "link"
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "x"
  | "linkedin"
  | "email"
  | "phone"
  | "map"
  | "menu"
  | "shop"
  | "calendar";

export interface HubButton {
  id: string;
  label: string;
  url: string;
  icon: HubIcon;
}

export interface HubData {
  logoUrl?: string;
  title: string;
  description?: string;
  theme?: { background: string; foreground: string; accent: string };
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
