import * as React from "react";
import type { HubIcon } from "@qira/shared";
import {
  Beer,
  Calendar,
  Camera,
  Car,
  Clock,
  Coffee,
  CreditCard,
  Download,
  Facebook,
  FileText,
  Flame,
  Gamepad2,
  Gift,
  Globe,
  Headphones,
  Heart,
  Instagram,
  Linkedin,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Phone,
  Pizza,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Twitter,
  Utensils,
  UtensilsCrossed,
  Video,
  Wifi,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export const HUB_ICON_OPTIONS: Array<{
  value: HubIcon;
  label: string;
  category: string;
  Icon: LucideIcon;
}> = [
  // General & Contacto
  { value: "link", label: "Enlace Web", category: "General", Icon: LinkIcon },
  { value: "whatsapp", label: "WhatsApp", category: "Social", Icon: MessageCircle },
  { value: "phone", label: "Llamar / Teléfono", category: "General", Icon: Phone },
  { value: "email", label: "Correo Electrónico", category: "General", Icon: Mail },
  { value: "map", label: "Ubicación / Mapa", category: "General", Icon: MapPin },
  { value: "calendar", label: "Reservas / Calendario", category: "General", Icon: Calendar },
  { value: "clock", label: "Horarios", category: "General", Icon: Clock },
  { value: "wifi", label: "Wi-Fi Clientes", category: "General", Icon: Wifi },
  { value: "download", label: "Descarga Directa", category: "General", Icon: Download },
  { value: "file-text", label: "Carta PDF / Documento", category: "General", Icon: FileText },

  // Gastronomía & Entretenimiento
  { value: "menu", label: "Menú / Carta", category: "Gastronomía", Icon: UtensilsCrossed },
  { value: "utensils", label: "Restaurante", category: "Gastronomía", Icon: Utensils },
  { value: "pizza", label: "Comida Rápida / Pizza", category: "Gastronomía", Icon: Pizza },
  { value: "coffee", label: "Cafetería / Brunch", category: "Gastronomía", Icon: Coffee },
  { value: "beer", label: "Bar / Cócteles", category: "Gastronomía", Icon: Beer },
  { value: "music", label: "Música / Rockola", category: "Entretenimiento", Icon: Music },
  { value: "headphones", label: "Playlist / DJ", category: "Entretenimiento", Icon: Headphones },
  { value: "gamepad", label: "Juego / Trivia", category: "Entretenimiento", Icon: Gamepad2 },
  { value: "trophy", label: "Premios / Sorteo", category: "Entretenimiento", Icon: Trophy },
  { value: "gift", label: " cupón / Regalo", category: "Entretenimiento", Icon: Gift },
  { value: "ticket", label: "Entradas / Eventos", category: "Entretenimiento", Icon: Ticket },

  // Comercio & Destacados
  { value: "shop", label: "Tienda Online", category: "Comercio", Icon: ShoppingBag },
  { value: "credit-card", label: "Pagos / Propina", category: "Comercio", Icon: CreditCard },
  { value: "car", label: "Domicilio / Delivery", category: "Comercio", Icon: Car },
  { value: "flame", label: "Popular / Tendencia", category: "Destacados", Icon: Flame },
  { value: "star", label: "Reseñas / Calificar", category: "Destacados", Icon: Star },
  { value: "heart", label: "Favoritos", category: "Destacados", Icon: Heart },
  { value: "sparkles", label: "Especial / VIP", category: "Destacados", Icon: Sparkles },

  // Redes Sociales & Multimedia
  { value: "instagram", label: "Instagram", category: "Social", Icon: Instagram },
  { value: "facebook", label: "Facebook", category: "Social", Icon: Facebook },
  { value: "tiktok", label: "TikTok", category: "Social", Icon: Sparkles },
  { value: "youtube", label: "YouTube", category: "Social", Icon: Youtube },
  { value: "x", label: "X / Twitter", category: "Social", Icon: Twitter },
  { value: "linkedin", label: "LinkedIn", category: "Social", Icon: Linkedin },
  { value: "camera", label: "Galería de Fotos", category: "Social", Icon: Camera },
  { value: "video", label: "Video / Reel", category: "Social", Icon: Video },
];

const ICON_MAP: Record<HubIcon, LucideIcon> = Object.fromEntries(
  HUB_ICON_OPTIONS.map((item) => [item.value, item.Icon]),
) as Record<HubIcon, LucideIcon>;

export function HubIconGlyph({ icon, className }: { icon: HubIcon; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Globe;
  return <Icon className={className} />;
}
