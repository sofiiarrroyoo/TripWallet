import type { Metadata } from "next";
import { CLASES_TITULO_PAGINA, CuerpoPagina, EncabezadoPagina, EnlaceVolver } from "@/componentes/pagina/Pagina";
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
    <section aria-labelledby="titulo-nuevo-viaje">
      <EncabezadoPagina>
        <EnlaceVolver href={RUTA_INICIO_PRIVADO}>Mis viajes</EnlaceVolver>
        <h1 id="titulo-nuevo-viaje" className={CLASES_TITULO_PAGINA}>
          Nuevo viaje
        </h1>
        <p className="max-w-xl text-lg">
          Elegí en qué moneda querés ver tus gastos. Lo demás lo podés contar después en el chat.
        </p>
      </EncabezadoPagina>
      <CuerpoPagina>
        <div className="max-w-xl">
          {carga.ok ? (
            <FormularioNuevoViaje monedas={carga.monedas} />
          ) : (
            <AvisoMonedasNoDisponibles mensaje={carga.mensaje} />
          )}
        </div>
      </CuerpoPagina>
    </section>
  );
}
