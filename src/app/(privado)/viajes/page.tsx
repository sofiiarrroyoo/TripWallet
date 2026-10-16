import { Luggage, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CLASES_TITULO_PAGINA, CuerpoPagina, EncabezadoPagina } from "@/componentes/pagina/Pagina";
import { Button } from "@/componentes/ui/button";
import { ItemViaje } from "@/componentes/viajes/ItemViaje";
import { RUTA_NUEVO_VIAJE } from "@/lib/rutas";
import { fechaIsoEn } from "@/lib/fechas";
import { ordenarViajesParaLista } from "@/servicios/estadoViaje";
import { listarViajes } from "@/servicios/viajes";

export const metadata: Metadata = { title: "Mis viajes" };

function BotonNuevoViaje({ texto }: { texto: string }) {
  return (
    <Button asChild className="h-11 self-start px-5 text-base">
      <Link href={RUTA_NUEVO_VIAJE}>
        <Plus aria-hidden />
        {texto}
      </Link>
    </Button>
  );
}

export default async function PaginaViajes() {
  const hoy = fechaIsoEn(new Date(), "UTC");
  const viajes = ordenarViajesParaLista(await listarViajes(), hoy);

  return (
    <section aria-labelledby="titulo-viajes">
      <EncabezadoPagina compacto ancho="max-w-none">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 id="titulo-viajes" className={CLASES_TITULO_PAGINA}>
            Mis viajes
          </h1>
          <BotonNuevoViaje texto="Nuevo viaje" />
        </div>
      </EncabezadoPagina>
      <CuerpoPagina ancho="max-w-none">
        {viajes.length === 0 ? (
          <div className="flex max-w-xl flex-col items-start gap-4 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
            <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Luggage className="size-6" />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight">Todavía no tenés viajes</h2>
            <p className="text-lg">
              Creá tu primer viaje con su moneda y su presupuesto, y empezá a contarle tus gastos al chat.
            </p>
            <BotonNuevoViaje texto="Crear mi primer viaje" />
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {viajes.map((viaje) => (
              <li key={viaje.id}>
                <ItemViaje viaje={viaje} hoy={hoy} />
              </li>
            ))}
          </ul>
        )}
      </CuerpoPagina>
    </section>
  );
}
