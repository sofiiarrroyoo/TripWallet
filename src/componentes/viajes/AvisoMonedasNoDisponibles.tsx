"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/componentes/ui/button";

export function AvisoMonedasNoDisponibles({ mensaje }: { mensaje: string }) {
  const router = useRouter();

  return (
    <div role="alert" className="flex flex-col gap-4 rounded-md bg-muted p-5">
      <p>{mensaje}</p>
      <Button variant="secondary" onClick={() => router.refresh()} className="h-10 self-start bg-background px-4">
        <RotateCw aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}
