"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { QrDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrEditor } from "@/components/qr/qr-editor";

export default function EditQrPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [qr, setQr] = React.useState<QrDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<QrDto>(`/qrs/${id}`)
      .then((data) => {
        if (!cancelled) {
          setQr(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el código QR");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Card className="h-24 animate-pulse bg-muted/40" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="h-[520px] animate-pulse bg-muted/40" />
          <Card className="h-96 animate-pulse bg-muted/40" />
        </div>
      </div>
    );
  }

  if (error || !qr) {
    return (
      <div className="mx-auto max-w-2xl p-12 text-center">
        <Card className="p-8 space-y-4">
          <h1 className="text-lg font-semibold">Código QR no encontrado</h1>
          <p className="text-sm text-muted-foreground">{error ?? "No se pudo cargar el código QR solicitado."}</p>
          <Button asChild variant="outline">
            <Link href="/qrs">
              <ArrowLeft className="size-4" />
              Volver a Códigos QR
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return <QrEditor mode="edit" initialQr={qr} />;
}
