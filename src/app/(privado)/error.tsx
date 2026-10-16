"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { MARGENES_PAGINA } from "@/componentes/pagina/Pagina";
import { TarjetaMensaje } from "@/componentes/pagina/TarjetaMensaje";
import { Button } from "@/componentes/ui/button";

// En producción Next no manda al navegador el mensaje de un error del servidor (puede tener datos internos),
// así que se muestra uno genérico; el detalle queda en el log del servidor.
export default function ErrorPrivado({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" className={`pt-10 ${MARGENES_PAGINA}`}>
      <TarjetaMensaje
        icono={<TriangleAlert className="size-6" />}
        titulo="No pudimos cargar esta página"
        accion={
          <Button onClick={retry} className="h-11 px-5 text-base">
            <RotateCw aria-hidden />
            Reintentar
          </Button>
        }
      >
        Puede ser un problema de conexión o algo de nuestro lado. Probá de nuevo.
      </TarjetaMensaje>
    </section>
  );
}
