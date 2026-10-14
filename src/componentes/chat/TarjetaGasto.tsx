"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";
import { Button } from "@/componentes/ui/button";
import { llamarApi, sinDatos } from "@/lib/llamarApi";
import type { GastoRegistrado } from "@/tipos/gasto";
import { resumenDeGasto } from "./resumenDeGasto";

type Props = {
  viajeId: string;
  gasto: GastoRegistrado;
  eliminado: boolean;
  // En un viaje cerrado no se pueden borrar gastos.
  puedeDeshacer: boolean;
  onEliminado: (gastoId: string) => void;
};

// Confirmación de un gasto registrado, con el botón para deshacerlo. "Deshacer" no pasa por el modelo: borra el gasto
// directo por la API.
export function TarjetaGasto({ viajeId, gasto, eliminado, puedeDeshacer, onEliminado }: Props) {
  const resumen = resumenDeGasto(gasto);
  const [deshaciendo, setDeshaciendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tarjeta = useRef<HTMLElement>(null);

  async function deshacer() {
    setDeshaciendo(true);
    setError(null);

    const resultado = await llamarApi(
      `/api/viajes/${encodeURIComponent(viajeId)}/gastos/${encodeURIComponent(gasto.id)}`,
      sinDatos,
      { metodo: "DELETE" },
    );
    setDeshaciendo(false);

    // Si el gasto ya no existía (por ejemplo, lo borró el bot), el resultado es el mismo que la persona quería.
    if (resultado.ok || resultado.error.codigo === "GASTO_NO_ENCONTRADO") {
      onEliminado(gasto.id);
      // El botón desaparece: el foco pasa a la tarjeta para que no se pierda.
      tarjeta.current?.focus();
      return;
    }
    setError(resultado.error.mensaje);
  }

  return (
    <div className="flex animate-in justify-start fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">
      <article
        ref={tarjeta}
        tabIndex={-1}
        aria-label={`Gasto registrado: ${gasto.descripcion}`}
        className="w-full max-w-[85%] rounded-2xl rounded-bl-md bg-globo-asistente p-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-[75%]"
      >
        <div className="flex flex-col gap-3 rounded-xl bg-background p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className={cn("font-medium", eliminado && "text-muted-foreground line-through")}>{resumen.titulo}</p>
            <p className="text-sm text-muted-foreground">{resumen.detalle}</p>
          </div>

          <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", eliminado && "text-muted-foreground line-through")}>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{resumen.montoPrincipal}</p>
            {resumen.montoOriginal && <p className="tabular-nums">de {resumen.montoOriginal}</p>}
          </div>

          {resumen.cotizacion && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {resumen.cotizacion}
              {resumen.fuente && (
                <>
                  <br />
                  Fuente: {resumen.fuente}
                </>
              )}
            </p>
          )}

          {resumen.aviso && (
            <p className="flex items-start gap-2 text-sm">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {resumen.aviso}
            </p>
          )}

          {eliminado && (
            <p aria-hidden className="text-sm font-medium">
              Gasto eliminado
            </p>
          )}
          {!eliminado && puedeDeshacer && (
            <Button
              type="button"
              variant="outline"
              onClick={deshacer}
              disabled={deshaciendo}
              aria-label={`Deshacer el gasto ${gasto.descripcion}`}
              className="h-10 self-start rounded-full px-4"
            >
              {deshaciendo && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
              {deshaciendo ? "Deshaciendo…" : "Deshacer"}
            </Button>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {/* Región siempre presente: los lectores de pantalla solo anuncian cambios en regiones que ya existían. */}
          <p role="status" className="sr-only">
            {eliminado ? "Gasto eliminado" : ""}
          </p>
        </div>
      </article>
    </div>
  );
}
