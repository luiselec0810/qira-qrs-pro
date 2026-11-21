"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Layers,
  Palette,
  QrCode,
  Route,
  Sheet,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface TourStep {
  id: string;
  route: string;
  selector: string;
  badge: string;
  title: string;
  whatItIs: string;
  howItWorks: string;
  bullets: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "qrs-overview",
    route: "/qrs",
    selector: '[data-tour="qrs-hero"]',
    badge: "Paso 1 de 7 • Panel Central",
    title: "Gestor de Códigos QR Dinámicos",
    whatItIs:
      "Es tu centro de mando donde viven todos tus códigos QR dinámicos, sus enlaces cortos (/q/slug) y el resumen en vivo de escaneos.",
    howItWorks:
      "Cada QR codifica siempre una URL corta permanente. Eso te permite cambiar el destino, pausar la campaña o agregar reglas en cualquier momento SIN que cambie el dibujo impreso del QR.",
    bullets: [
      "Copia el enlace corto o descarga el QR en PNG de alta definición (2048 px) y SVG vectorial.",
      "Pausa o reactiva campañas en un clic sin perder las métricas.",
      "Envía cualquier QR directo al Print Studio o a su vista de Analítica.",
    ],
    icon: QrCode,
  },
  {
    id: "qr-destinations",
    route: "/qrs/new",
    selector: '[data-tour="qr-editor-tabs"]',
    badge: "Paso 2 de 7 • Destinos y Mini-Landings",
    title: "URLs Externas, Tarjetas vCard y Link Hubs",
    whatItIs:
      "El constructor de destinos te permite elegir a dónde llegará el usuario cuando escanee el código.",
    howItWorks:
      "Además de redirigir a cualquier sitio web externo, QIRA aloja automáticamente páginas móviles ultrarrápidas en /p/slug sin que necesites un servidor aparte:",
    bullets: [
      "URL Externa: redirige en menos de 50 ms gracias a la caché en Redis.",
      "Contacto vCard: genera una tarjeta digital móvil con botón para guardar el contacto (.vcf) directo en la agenda del teléfono.",
      "Link Hub / Menú Express: crea una página con tu logo, colores y botones hacia WhatsApp, Instagram, menú PDF, tienda o mapa.",
    ],
    icon: Compass,
  },
  {
    id: "qr-visual-rules",
    route: "/qrs/new",
    selector: '[data-tour="qr-preview-panel"]',
    badge: "Paso 3 de 7 • Diseño, Contraste y Reglas",
    title: "Personalizador Visual + Reglas Inteligentes",
    whatItIs:
      "En las pestañas Diseño, Reglas y Seguridad personalizas la estética del QR y su comportamiento inteligente.",
    howItWorks:
      "El panel derecho actualiza el código en tiempo real mientras verificamos automáticamente la legibilidad y las reglas:",
    bullets: [
      "Diseño Visual: 13 formas de cuerpo, 11 marcos de ojo, 13 centros de ojo, degradados, fondo transparente y logo central (con corrección H automática al 30%).",
      "Verificador WCAG: alerta automática si el contraste baja de 3.5:1 para evitar QRs que no escaneen en imprenta.",
      "Reglas, PIN y Webhooks: redirige según horario/día, sistema operativo (iOS/Android/PC) o idioma, protege con PIN e inyecta parámetros UTM o webhooks hacia n8n.",
    ],
    icon: Palette,
  },
  {
    id: "print-studio-gallery",
    route: "/studio",
    selector: '[data-tour="studio-presets"]',
    badge: "Paso 4 de 7 • Formatos Físicos",
    title: "Plantillas Físicas en Centímetros",
    whatItIs:
      "Aquí inicias o administras tus diseños de papelería física con medidas reales para imprenta.",
    howItWorks:
      "Puedes arrancar con un lienzo personalizado o elegir formatos estándar listos para producción:",
    bullets: [
      "Hablador de mesa (10 × 15 cm), Sticker (5 × 5 cm), Tarjeta de presentación (9 × 5 cm) o Flyer (14 × 21 cm).",
      "El motor convierte automáticamente cada centímetro a píxeles exactos a 300 DPI: px = round((cm / 2.54) × 300).",
    ],
    icon: Layers,
  },
  {
    id: "print-studio-canvas",
    route: "/studio/new",
    selector: '[data-tour="studio-workspace"]',
    badge: "Paso 5 de 7 • Editor Gráfico 300 DPI",
    title: "Print Studio: Lienzo, Capas, 38 Tipografías y Pliegos",
    whatItIs:
      "Un estudio gráfico completo en centímetros con soporte de Frente y Reverso (doble cara) y guías profesionales de imprenta.",
    howItWorks:
      "La línea cian marca el corte final (trim) y la línea roja exterior marca el sangrado (bleed de 3 mm) para que no queden bordes blancos al guillotinar:",
    bullets: [
      "Agrega textos con 38 tipografías con vista previa en vivo, imágenes (con alerta si bajan de 240 DPI), formas y fondos.",
      "Inserta un QR dinámico reactivo: si cambias los colores del QR, se actualiza solo en la tarjeta.",
      "Exporta en PNG transparente, JPG a 300 DPI, PDF vectorial o Pliego Impuesto (Carta, A4, Tabloide) con marcas de corte de 4 mm.",
    ],
    icon: Route,
  },
  {
    id: "csv-batch",
    route: "/batch",
    selector: '[data-tour="batch-workflow"]',
    badge: "Paso 6 de 7 • Automatización Masiva",
    title: "Generación por Lotes vía CSV",
    whatItIs:
      "Produce decenas o cientos de tarjetas y códigos QR únicos en una sola operación a partir de un archivo Excel / CSV.",
    howItWorks:
      "Escribe variables como {{mesa}} o {{nombre}} en las capas de texto de tu tarjeta y en la URL base del QR:",
    bullets: [
      "Al subir el CSV, el sistema crea N códigos QR dinámicos independientes en la base de datos.",
      "Renderiza las N tarjetas a 300 DPI reemplazando cada texto y cada QR.",
      "Descarga un .ZIP con todos los PNGs + manifiesto CSV, un PDF multipágina o pliegos listos para guillotina.",
    ],
    icon: Sheet,
  },
  {
    id: "analytics-dashboard",
    route: "/analytics",
    selector: '[data-tour="analytics-overview"]',
    badge: "Paso 7 de 7 • Telemetría en Vivo",
    title: "Analítica de Escaneos y Rendimiento",
    whatItIs:
      "El panel de inteligencia donde mides el impacto real de tus códigos QR impresos o digitales.",
    howItWorks:
      "Cada escaneo se registra de forma asíncrona (sin frenar la redirección) calculando visitantes únicos mediante un hash diario anónimo:",
    bullets: [
      "Filtra de forma global o por un QR específico, en rangos de 7, 30 o 90 días, agrupado por día o por hora.",
      "Analiza la curva de Escaneos Totales vs. Visitantes Únicos.",
      "Consulta la distribución por Sistema Operativo (iOS, Android, Desktop), tipo de dispositivo, ciudades principales y ranking de QRs.",
    ],
    icon: BarChart3,
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [stepIdx, setStepIdx] = React.useState(0);
  const [rect, setRect] = React.useState<SpotlightRect | null>(null);

  const step = TOUR_STEPS[stepIdx] ?? TOUR_STEPS[0]!;

  // Navigate to the step's route whenever stepIdx changes while open
  React.useEffect(() => {
    if (!open) return;
    if (pathname !== step.route) {
      router.push(step.route);
    }
  }, [open, step.route, pathname, router]);

  // Measure target element and scroll it smoothly into view
  React.useEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const locate = () => {
      if (cancelled) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const updateBox = () => {
          if (cancelled) return;
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.height > 0) {
            setRect({
              top: Math.max(8, b.top - 8),
              left: Math.max(8, b.left - 8),
              width: Math.min(window.innerWidth - 16, b.width + 16),
              height: Math.min(window.innerHeight - 16, b.height + 16),
            });
          }
        };
        setTimeout(updateBox, 260);
        updateBox();
      } else if (attempts < 15) {
        attempts++;
        setTimeout(locate, 150);
      } else {
        setRect(null);
      }
    };

    locate();

    const handleResizeOrScroll = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) return;
      const b = el.getBoundingClientRect();
      setRect({
        top: Math.max(8, b.top - 8),
        left: Math.max(8, b.left - 8),
        width: Math.min(window.innerWidth - 16, b.width + 16),
        height: Math.min(window.innerHeight - 16, b.height + 16),
      });
    };

    window.addEventListener("resize", handleResizeOrScroll);
    window.addEventListener("scroll", handleResizeOrScroll, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResizeOrScroll);
      window.removeEventListener("scroll", handleResizeOrScroll, true);
    };
  }, [open, step, pathname]);

  // Keyboard navigation (Left/Right/Escape)
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") {
        setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setStepIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const Icon = step.icon;
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dimmed backdrop + glowing spotlight frame around the active section */}
      {rect ? (
        <div
          className="fixed rounded-2xl border-2 border-sky-400 transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow:
              "0 0 0 9999px rgba(3, 7, 18, 0.72), 0 0 32px 4px rgba(56, 189, 248, 0.45), inset 0 0 18px rgba(56, 189, 248, 0.2)",
          }}
        >
          <span className="absolute -top-3 left-4 inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-2.5 py-0.5 text-[11px] font-bold text-slate-950 shadow-md">
            <Sparkles className="size-3" />
            Sección activa
          </span>
        </div>
      ) : (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px]" />
      )}

      {/* Floating Tutorial Guide Card */}
      <div className="pointer-events-auto fixed right-5 bottom-5 z-50 w-[calc(100vw-2.5rem)] max-w-lg rounded-2xl border border-sky-400/35 bg-[#0a1324]/95 p-5 text-foreground shadow-[0_24px_60px_rgba(2,6,23,0.95)] backdrop-blur-xl">
        {/* Top bar: step badge + progress dots + close */}
        <div className="flex items-center justify-between gap-2">
          <Badge tone="default" className="gap-1.5">
            <Icon className="size-3.5 text-sky-300" />
            {step.badge}
          </Badge>

          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIdx(idx)}
                title={s.title}
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  idx === stepIdx
                    ? "w-6 bg-sky-400"
                    : idx < stepIdx
                      ? "w-2 bg-sky-400/50 hover:bg-sky-400/80"
                      : "w-2 bg-white/15 hover:bg-white/30",
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Cerrar tutorial (Esc)"
            className="rounded-lg p-1 text-muted-foreground transition hover:bg-white/10 hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Title & Explanation */}
        <div className="mt-3.5 space-y-2">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {step.title}
          </h3>
          <p className="text-xs leading-relaxed text-sky-200/90 font-medium">
            {step.whatItIs}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {step.howItWorks}
          </p>
        </div>

        {/* Key capabilities list */}
        <ul className="mt-3 space-y-1.5 rounded-xl border border-sky-400/15 bg-[#060c18]/80 p-3">
          {step.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-sky-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* Footer controls */}
        <div className="mt-4 flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground"
          >
            Saltar guía
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFirst}
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            >
              <ArrowLeft className="size-3.5" />
              Anterior
            </Button>

            {isLast ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  router.push("/qrs");
                }}
              >
                <CheckCircle2 className="size-3.5" />
                Finalizar Recorrido
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
              >
                Siguiente
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
