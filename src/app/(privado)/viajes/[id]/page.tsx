import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { aMensajeUI } from "@/componentes/chat/mensajesUI";
import { ChatViaje } from "@/componentes/chat/ChatViaje";
import { ProveedorModoDebug } from "@/componentes/chat/ModoDebug";
import { BarraViaje } from "@/componentes/viajes/BarraViaje";
import { ResumenDelViaje } from "@/componentes/viajes/ResumenDelViaje";
import { CuerpoPagina } from "@/componentes/pagina/Pagina";
import { ErrorNoEncontrado } from "@/errores";
import { formatearMonto } from "@/lib/formatos";
import { cargarChat } from "@/servicios/chat";
import { obtenerResumenViaje } from "@/servicios/cierreViaje";

export const metadata: Metadata = { title: "Viaje" };

async function buscarChat(id: string) {
  try {
    return await cargarChat(id);
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
  const { viaje, mensajes, gastosEliminados, calificaciones } = await buscarChat(id);
  // El resumen solo existe mientras el viaje está cerrado.
  const resumen = viaje.estado === "cerrado" ? await obtenerResumenViaje(viaje.id) : null;

  return (
    <ProveedorModoDebug>
    <section aria-labelledby="titulo-viaje">
      <BarraViaje viaje={viaje} />
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
        {viaje.estado === "cerrado" && <ResumenDelViaje resumen={resumen} />}
        <ChatViaje
          key={viaje.id}
          viajeId={viaje.id}
          destino={viaje.destino}
          viajeCerrado={viaje.estado === "cerrado"}
          mensajesIniciales={mensajes.map(aMensajeUI)}
          gastosEliminados={gastosEliminados}
          calificaciones={calificaciones}
        />
      </CuerpoPagina>
    </section>
    </ProveedorModoDebug>
  );
}
