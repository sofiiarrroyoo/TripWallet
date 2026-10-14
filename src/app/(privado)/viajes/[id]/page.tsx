import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorNoEncontrado } from "@/errores";
import { formatearMonto, formatearRangoFechas } from "@/lib/formatos";
import { RUTA_INICIO_PRIVADO } from "@/lib/rutas";
import { obtenerViaje } from "@/servicios/viajes";
import type { Viaje } from "@/tipos/viaje";

export const metadata: Metadata = { title: "Viaje" };

async function buscarViaje(id: string): Promise<Viaje> {
  try {
    return await obtenerViaje(id);
  } catch (error) {
    if (error instanceof ErrorNoEncontrado) notFound();
    throw error;
  }
}

export default async function PaginaViaje({ params }: PageProps<"/viajes/[id]">) {
  const { id } = await params;
  const viaje = await buscarViaje(id);

  return (
    <section
      aria-labelledby="titulo-viaje"
      className="flex w-full max-w-3xl flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 animation-duration-500 motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-4">
        <Link
          href={RUTA_INICIO_PRIVADO}
          className="flex items-center gap-1.5 self-start font-medium underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Mis viajes
        </Link>
        <h1
          id="titulo-viaje"
          className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance"
        >
          {viaje.nombre}
        </h1>
        <p className="text-lg">
          {viaje.destino} · {formatearRangoFechas(viaje.fechaInicio, viaje.fechaFin)}
        </p>
      </div>

      <dl className="grid gap-4 rounded-md bg-muted p-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">Moneda base</dt>
          <dd className="font-medium">{viaje.monedaBase}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">Presupuesto</dt>
          <dd className="font-medium">
            {viaje.presupuestoTotal === null ? "Sin presupuesto" : formatearMonto(viaje.presupuestoTotal, viaje.monedaBase)}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm text-muted-foreground">Estado</dt>
          <dd className="font-medium">{viaje.estado === "abierto" ? "Abierto" : "Cerrado"}</dd>
        </div>
      </dl>

      <p className="text-lg">Pronto vas a poder contarle tus gastos al chat de este viaje.</p>
    </section>
  );
}
