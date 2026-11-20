"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { StudioEditor } from "@/components/studio/studio-editor";

function NewStudioInner() {
  const searchParams = useSearchParams();
  const preset = searchParams.get("preset");
  return <StudioEditor initialPresetId={preset} />;
}

export default function NewStudioPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
          Inicializando Print Studio...
        </div>
      }
    >
      <NewStudioInner />
    </React.Suspense>
  );
}
