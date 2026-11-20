import * as React from "react";
import type { HubIcon } from "@qira/shared";
import {
  Calendar,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Sparkles,
  Twitter,
  UtensilsCrossed,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export const HUB_ICON_OPTIONS: Array<{ value: HubIcon; label: string; Icon: LucideIcon }> = [
  { value: "link", label: "Enlace", Icon: LinkIcon },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "facebook", label: "Facebook", Icon: Facebook },
  { value: "tiktok", label: "TikTok", Icon: Sparkles },
  { value: "youtube", label: "YouTube", Icon: Youtube },
  { value: "x", label: "X / Twitter", Icon: Twitter },
  { value: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { value: "email", label: "Correo electrónico", Icon: Mail },
  { value: "phone", label: "Teléfono", Icon: Phone },
  { value: "map", label: "Mapa / Ubicación", Icon: MapPin },
  { value: "menu", label: "Menú", Icon: UtensilsCrossed },
  { value: "shop", label: "Tienda", Icon: ShoppingBag },
  { value: "calendar", label: "Calendario / Reservas", Icon: Calendar },
];

const ICON_MAP: Record<HubIcon, LucideIcon> = Object.fromEntries(
  HUB_ICON_OPTIONS.map((item) => [item.value, item.Icon]),
) as Record<HubIcon, LucideIcon>;

export function HubIconGlyph({ icon, className }: { icon: HubIcon; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Globe;
  return <Icon className={className} />;
}
