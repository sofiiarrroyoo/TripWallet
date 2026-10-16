import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "cn";
import { formatearMonto, formatearRangoFechas } from "@/lib/formatos";
import { rutaViaje } from "@/lib/rutas";
import { type SituacionViaje, describirTiempo, situacionDelViaje } from "@/servicios/estadoViaje";
import type { Viaje } from "@/tipos/viaje";

// El estado va siempre escrito (no solo en color), y cada combinación de colores cumple el contraste AA.
const ETIQUETAS: Record<SituacionViaje, { texto: string; clases: string }> = {
  en_curso: { texto: "En curso", clases: "bg-primary text-primary-foreground" },
  proximo: { texto: "Próximo", clases: "bg-accent text-accent-foreground" },
  terminado: { texto: "Sin cerrar", clases: "bg-[#f6e6c4] text-[#4d3500]" },
  cerrado: { texto: "Cerrado", clases: "bg-muted text-muted-foreground" },
};

export function ItemViaje({ viaje, hoy }: { viaje: Viaje; hoy: string }) {
  const situacion = situacionDelViaje(viaje, hoy);
  const etiqueta = ETIQUETAS[situacion];

  return (
    <Link
      href={rutaViaje(viaje.id)}
      className="group flex h-full flex-col gap-5 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("rounded-full px-3 py-1 text-sm font-medium", etiqueta.clases)}>{etiqueta.texto}</span>
        <span className="text-sm text-muted-foreground">{describirTiempo(viaje, hoy)}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-2xl leading-tight font-semibold tracking-tight text-balance">{viaje.nombre}</p>
        <p className="flex items-center gap-2">
          <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{viaje.destino}</span>
        </p>
        <p className="flex items-center gap-2">
          <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span>{formatearRangoFechas(viaje.fechaInicio, viaje.fechaFin)}</span>
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          {viaje.presupuestoTotal === null
            ? `En ${viaje.monedaBase}, sin presupuesto`
            : `Presupuesto ${formatearMonto(viaje.presupuestoTotal, viaje.monedaBase)}`}
        </p>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </div>
    </Link>
  );
}
