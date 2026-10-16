import type { Metadata } from "next";
import { CLASES_TITULO_PAGINA, CuerpoPagina, EncabezadoPagina, EnlaceVolver } from "@/componentes/pagina/Pagina";
import { FormularioNuevoViaje } from "@/componentes/viajes/FormularioNuevoViaje";
import { RUTA_INICIO_PRIVADO } from "@/lib/rutas";
import { listarMonedas } from "@/servicios/monedas";

export const metadata: Metadata = { title: "Nuevo viaje" };

const PASOS = [
  "Creás el viaje y se abre su chat.",
  "Le contás tus gastos como hablás: el bot los convierte a tu moneda.",
  "Mirás en el panel cuánto llevás gastado y cuánto te queda.",
];

export default async function PaginaNuevoViaje() {
  const { monedas, fuente } = await listarMonedas();

  return (
    <section aria-labelledby="titulo-nuevo-viaje">
      <EncabezadoPagina compacto ancho="max-w-none">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 id="titulo-nuevo-viaje" className={CLASES_TITULO_PAGINA}>
            Nuevo viaje
          </h1>
          <EnlaceVolver href={RUTA_INICIO_PRIVADO}>Mis viajes</EnlaceVolver>
        </div>
      </EncabezadoPagina>
      <CuerpoPagina ancho="max-w-none">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,52rem)_minmax(0,22rem)] lg:items-start">
          <div className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 max-sm:rounded-none max-sm:bg-transparent max-sm:p-0 max-sm:shadow-none max-sm:ring-0 sm:p-8">
            {fuente === "respaldo" && (
              <p role="status" className="rounded-md bg-muted p-4">
                No pudimos consultar las cotizaciones, así que te mostramos la lista estándar de monedas. Podés
                crear el viaje igual.
              </p>
            )}
            <FormularioNuevoViaje monedas={monedas} />
          </div>

          <aside className="hidden flex-col gap-4 rounded-2xl bg-accent p-6 text-accent-foreground lg:flex">
            <h2 className="text-lg font-semibold tracking-tight">Cómo sigue</h2>
            <ol className="flex flex-col gap-4">
              {PASOS.map((paso, indice) => (
                <li key={paso} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
                  >
                    {indice + 1}
                  </span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </CuerpoPagina>
    </section>
  );
}
