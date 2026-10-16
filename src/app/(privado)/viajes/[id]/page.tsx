import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { aMensajeUI } from "@/componentes/chat/mensajesUI";
import { ChatViaje } from "@/componentes/chat/ChatViaje";
import { ProveedorModoDebug } from "@/componentes/chat/ModoDebug";
import { BarraViaje } from "@/componentes/viajes/BarraViaje";
import { ResumenDelViaje } from "@/componentes/viajes/ResumenDelViaje";
import { CuerpoPagina } from "@/componentes/pagina/Pagina";
import { ErrorNoEncontrado } from "@/errores";
import { PanelLateral } from "@/componentes/viajes/PanelLateral";
import { fechaIsoEn } from "@/lib/fechas";
import { obtenerPanelViaje } from "@/servicios/panelViaje";
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

export default async function PaginaViaje({ params }: PageProps<"/viajes/[id]">) {
  const { id } = await params;
  const { viaje, mensajes, gastosEliminados, calificaciones } = await buscarChat(id);
  // El resumen solo existe mientras el viaje está cerrado.
  const resumen = viaje.estado === "cerrado" ? await obtenerResumenViaje(viaje.id) : null;
  const panel = await obtenerPanelViaje(viaje, fechaIsoEn(new Date(), "UTC"));

  return (
    <ProveedorModoDebug>
    <section aria-labelledby="titulo-viaje" className="-mb-16 flex h-[calc(100dvh-4rem)] flex-col">
      <BarraViaje viaje={viaje} />
      <div className="flex min-h-0 flex-1">
      <div data-scroll-chat className="min-h-0 min-w-0 flex-[11] overflow-y-auto">
      <CuerpoPagina>
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
      </div>
      <PanelLateral panel={panel} />
      </div>
    </section>
    </ProveedorModoDebug>
  );
}
