import type { Metadata } from "next";
import { CLASES_TITULO_PAGINA, CuerpoPagina, EncabezadoPagina, EnlaceVolver } from "@/componentes/pagina/Pagina";
import { FormularioNuevoViaje } from "@/componentes/viajes/FormularioNuevoViaje";
import { RUTA_INICIO_PRIVADO } from "@/lib/rutas";
import { listarMonedas } from "@/servicios/monedas";

export const metadata: Metadata = { title: "Nuevo viaje" };

export default async function PaginaNuevoViaje() {
  const { monedas, fuente } = await listarMonedas();

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
        <div className="flex max-w-xl flex-col gap-6">
          {fuente === "respaldo" && (
            <p role="status" className="rounded-md bg-muted p-4">
              No pudimos consultar las cotizaciones, así que te mostramos la lista estándar de monedas. Podés crear
              el viaje igual.
            </p>
          )}
          <FormularioNuevoViaje monedas={monedas} />
        </div>
      </CuerpoPagina>
    </section>
  );
}
