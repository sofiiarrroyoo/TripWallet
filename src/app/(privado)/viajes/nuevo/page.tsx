import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AvisoMonedasNoDisponibles } from "@/componentes/viajes/AvisoMonedasNoDisponibles";
import { FormularioNuevoViaje } from "@/componentes/viajes/FormularioNuevoViaje";
import { ErrorCotizacionNoDisponible } from "@/errores";
import { RUTA_INICIO_PRIVADO } from "@/lib/rutas";
import { listarMonedas } from "@/servicios/monedas";
import type { Moneda } from "@/tipos/moneda";

export const metadata: Metadata = { title: "Nuevo viaje" };

type CargaMonedas = { ok: true; monedas: Moneda[] } | { ok: false; mensaje: string };

// Si la API de cotizaciones no responde se muestra un aviso con reintento en lugar de la página de error
// genérica: el resto de la pantalla sigue sirviendo para entender qué falta.
async function cargarMonedas(): Promise<CargaMonedas> {
  try {
    return { ok: true, monedas: await listarMonedas() };
  } catch (error) {
    if (error instanceof ErrorCotizacionNoDisponible) return { ok: false, mensaje: error.message };
    throw error;
  }
}

export default async function PaginaNuevoViaje() {
  const carga = await cargarMonedas();

  return (
    <section
      aria-labelledby="titulo-nuevo-viaje"
      className="flex w-full max-w-xl flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 animation-duration-500 motion-reduce:animate-none"
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
          id="titulo-nuevo-viaje"
          className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.04em]"
        >
          Nuevo viaje
        </h1>
        <p className="text-lg">Elegí en qué moneda querés ver tus gastos. Lo demás lo podés contar después en el chat.</p>
      </div>

      {carga.ok ? (
        <FormularioNuevoViaje monedas={carga.monedas} />
      ) : (
        <AvisoMonedasNoDisponibles mensaje={carga.mensaje} />
      )}
    </section>
  );
}
