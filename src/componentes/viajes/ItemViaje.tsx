import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatearMonto, formatearRangoFechas } from "@/lib/formatos";
import { rutaViaje } from "@/lib/rutas";
import type { Viaje } from "@/tipos/viaje";

export function ItemViaje({ viaje }: { viaje: Viaje }) {
  return (
    <Link
      href={rutaViaje(viaje.id)}
      className="group flex items-center gap-4 rounded-md bg-muted px-5 py-4 transition-colors hover:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_5%)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:px-6 sm:py-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-xl font-semibold tracking-tight">{viaje.nombre}</span>
          {viaje.estado === "cerrado" && <span className="text-sm text-muted-foreground">Cerrado</span>}
        </p>
        <p>
          {viaje.destino} · {formatearRangoFechas(viaje.fechaInicio, viaje.fechaFin)}
        </p>
        <p className="text-sm text-muted-foreground">
          {viaje.presupuestoTotal === null
            ? `En ${viaje.monedaBase}, sin presupuesto`
            : `Presupuesto ${formatearMonto(viaje.presupuestoTotal, viaje.monedaBase)}`}
        </p>
      </div>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}
