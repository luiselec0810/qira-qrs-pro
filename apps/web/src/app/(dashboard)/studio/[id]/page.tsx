"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { CardDto } from "@/lib/types";
import { StudioEditor } from "@/components/studio/studio-editor";

export default function EditStudioCardPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [card, setCard] = React.useState<CardDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    api
      .get<CardDto>(`/cards/${id}`)
      .then((res) => {
        if (!cancelled) setCard(res);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-destructive">
        No se pudo cargar el diseño de tarjeta: {error}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        Cargando diseño de tarjeta...
      </div>
    );
  }

  return <StudioEditor initialCard={card} />;
}
