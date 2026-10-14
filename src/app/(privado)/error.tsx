"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/componentes/ui/button";

// En producción Next no manda al navegador el mensaje de un error del servidor (puede tener datos internos),
// así que se muestra uno genérico; el detalle queda en el log del servidor.
export default function ErrorPrivado({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">No pudimos cargar esta página</h1>
        <p className="text-lg">Puede ser un problema de conexión o algo de nuestro lado. Probá de nuevo.</p>
      </div>
      <Button onClick={retry} className="h-11 self-start px-5 text-base">
        <RotateCw aria-hidden />
        Reintentar
      </Button>
    </section>
  );
}
