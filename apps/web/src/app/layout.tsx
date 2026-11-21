import type { Metadata } from "next";
import { Toaster } from "sonner";
import { GOOGLE_FONTS_STYLESHEET_URL } from "@/components/studio/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "QIRA QRs Pro — Estudio de QRs Dinámicos y Tarjetas para Imprenta",
  description:
    "Plataforma de códigos QR dinámicos con reglas inteligentes, analítica y estudio de diseño de tarjetas a 300 DPI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_STYLESHEET_URL} />
      </head>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
