import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CLASES_TITULO_PAGINA, CuerpoPagina, EncabezadoPagina, EnlaceVolver } from "@/componentes/pagina/Pagina";
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

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      {/* Blanco al 70% sobre la tinta da 7:1: alcanza para texto secundario. */}
      <dt className="text-sm text-background/70">{etiqueta}</dt>
      <dd className="text-lg font-medium">{valor}</dd>
    </div>
  );
}

export default async function PaginaViaje({ params }: PageProps<"/viajes/[id]">) {
  const { id } = await params;
  const viaje = await buscarViaje(id);

  return (
    <section aria-labelledby="titulo-viaje">
      <EncabezadoPagina>
        <EnlaceVolver href={RUTA_INICIO_PRIVADO}>Mis viajes</EnlaceVolver>
        <h1 id="titulo-viaje" className={CLASES_TITULO_PAGINA}>
          {viaje.nombre}
        </h1>
        <p className="text-lg">
          {viaje.destino} · {formatearRangoFechas(viaje.fechaInicio, viaje.fechaFin)}
        </p>
      </EncabezadoPagina>
      <CuerpoPagina>
        <dl className="grid gap-5 rounded-md bg-foreground p-6 text-background sm:grid-cols-3">
          <Dato etiqueta="Moneda base" valor={viaje.monedaBase} />
          <Dato
            etiqueta="Presupuesto"
            valor={
              viaje.presupuestoTotal === null
                ? "Sin presupuesto"
                : formatearMonto(viaje.presupuestoTotal, viaje.monedaBase)
            }
          />
          <Dato etiqueta="Estado" valor={viaje.estado === "abierto" ? "Abierto" : "Cerrado"} />
        </dl>
        <p className="text-lg">Pronto vas a poder contarle tus gastos al chat de este viaje.</p>
      </CuerpoPagina>
    </section>
  );
}
