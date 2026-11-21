"use client";

import * as React from "react";
import Link from "next/link";
import { Layers, Plus, Ruler, Trash2 } from "lucide-react";
import { CARD_PRESETS, cmToPx } from "@qira/shared";
import { api } from "@/lib/api";
import type { CardDto } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui/card";

export default function StudioListPage() {
  const [cards, setCards] = React.useState<CardDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadCards = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: CardDto[] }>("/cards");
      setCards(res.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCards();
  }, [loadCards]);

  async function handleDelete(id: string) {
    try {
      await api.delete(`/cards/${id}`);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Print Studio (300 DPI)"
        description="Diseña tarjetas físicas en centímetros con sangrado de 3 mm, soporte doble cara (frente y reverso), QRs dinámicos reactivos e imposición en pliego."
        actions={
          <Button asChild>
            <Link href="/studio/new">
              <Plus />
              Nuevo Diseño de Tarjeta
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 px-6">
        {/* Quick-Start Physical Templates (RF-03.1) */}
        <section data-tour="studio-presets" className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Plantillas Físicas Predefinidas (RF-03.1)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARD_PRESETS.map((preset) => (
              <Card key={preset.id} className="flex flex-col justify-between">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{preset.label}</CardTitle>
                    <Ruler className="size-4 text-primary" />
                  </div>
                  <CardDescription>
                    {preset.widthCm} × {preset.heightCm} cm ({cmToPx(preset.widthCm)} ×{" "}
                    {cmToPx(preset.heightCm)} px @ 300 DPI)
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/studio/new?preset=${preset.id}`}>
                      <Plus />
                      Crear {preset.label.split(" ")[0]}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* Saved Card Designs */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Diseños Guardados ({cards.length})
            </h2>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {loading ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Cargando diseños guardados...
              </CardContent>
            </Card>
          ) : cards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Layers className="size-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Aún no hay diseños guardados</p>
                  <p className="text-sm text-muted-foreground">
                    Elige una plantilla arriba o inicia un lienzo personalizado en centímetros.
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href="/studio/new">
                    <Plus />
                    Abrir Print Studio
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <Card key={card.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="truncate text-base">{card.name}</CardTitle>
                      <Badge tone={card.isDoubleSided ? "default" : "muted"}>
                        {card.isDoubleSided ? "Frente + Reverso" : "Una cara"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {card.widthCm} × {card.heightCm} cm • Sangrado {card.bleedMm} mm •{" "}
                      {cmToPx(card.widthCm)} × {cmToPx(card.heightCm)} px
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between gap-2">
                    <Button size="sm" asChild className="flex-1">
                      <Link href={`/studio/${card.id}`}>Abrir en Studio</Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => void handleDelete(card.id)}
                      title="Eliminar diseño de tarjeta"
                    >
                      <Trash2 />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
