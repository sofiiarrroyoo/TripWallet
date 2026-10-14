import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CLASES_TITULO_PAGINA, CuerpoPagina, EncabezadoPagina } from "@/componentes/pagina/Pagina";
import { Button } from "@/componentes/ui/button";
import { ItemViaje } from "@/componentes/viajes/ItemViaje";
import { RUTA_NUEVO_VIAJE } from "@/lib/rutas";
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
  const viajes = await listarViajes();

  if (viajes.length === 0) {
    return (
      <section aria-labelledby="titulo-viajes" className="flex flex-1 flex-col">
        <EncabezadoPagina className="flex-1 lg:pb-24">
          <h1 id="titulo-viajes" className="text-[clamp(2.5rem,7vw,5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance">
            Todavía no tenés viajes
          </h1>
          <p className="max-w-xl text-lg">
            Creá tu primer viaje con su moneda y su presupuesto, y empezá a contarle tus gastos al chat.
          </p>
          <div className="pt-2">
            <BotonNuevoViaje texto="Crear mi primer viaje" />
          </div>
        </EncabezadoPagina>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-viajes">
      <EncabezadoPagina>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 id="titulo-viajes" className={CLASES_TITULO_PAGINA}>
            Mis viajes
          </h1>
          <BotonNuevoViaje texto="Nuevo viaje" />
        </div>
      </EncabezadoPagina>
      <CuerpoPagina>
        <ul className="flex flex-col gap-3">
          {viajes.map((viaje) => (
            <li key={viaje.id}>
              <ItemViaje viaje={viaje} />
            </li>
          ))}
        </ul>
      </CuerpoPagina>
    </section>
  );
}
