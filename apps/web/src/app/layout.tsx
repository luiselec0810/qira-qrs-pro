import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "QIRA QRs Pro — Estudio de QRs Dinámicos y Tarjetas para Imprenta",
  description:
    "Plataforma de códigos QR dinámicos con reglas inteligentes, analítica y estudio de diseño de tarjetas a 300 DPI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
