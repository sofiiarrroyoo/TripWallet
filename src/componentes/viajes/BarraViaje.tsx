import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BotonModoDebug } from "@/componentes/chat/ModoDebug";
import { MARGENES_PAGINA } from "@/componentes/pagina/Pagina";
import { AccionesViaje } from "@/componentes/viajes/AccionesViaje";
import { cn } from "cn";
import { formatearRangoFechas } from "@/lib/formatos";
import { RUTA_INICIO_PRIVADO } from "@/lib/rutas";
import type { Viaje } from "@/tipos/viaje";

// Queda fija arriba mientras se baja por la página: volver, modo debug y cerrar viaje siempre a mano.
export function BarraViaje({ viaje }: { viaje: Viaje }) {
  return (
    <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className={cn("flex items-center gap-3 py-3", MARGENES_PAGINA)}>
        <Link
          href={RUTA_INICIO_PRIVADO}
          aria-label="Volver a mis viajes"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border hover:bg-muted"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 id="titulo-viaje" className="truncate text-lg leading-tight font-semibold tracking-tight">
            {viaje.nombre}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {viaje.destino} · {formatearRangoFechas(viaje.fechaInicio, viaje.fechaFin)}
          </p>
        </div>
        <BotonModoDebug />
        <AccionesViaje viajeId={viaje.id} estado={viaje.estado} />
      </div>
    </div>
  );
}
