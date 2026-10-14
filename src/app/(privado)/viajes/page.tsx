import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/componentes/ui/button";
import { ItemViaje } from "@/componentes/viajes/ItemViaje";
import { RUTA_NUEVO_VIAJE } from "@/lib/rutas";
import { listarViajes } from "@/servicios/viajes";

export const metadata: Metadata = { title: "Mis viajes" };

const ENTRADA = "animate-in fade-in slide-in-from-bottom-4 animation-duration-500 motion-reduce:animate-none";

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
      <section aria-labelledby="titulo-viajes" className={`flex max-w-2xl flex-col gap-6 ${ENTRADA}`}>
        <div className="flex flex-col gap-4">
          <h1
            id="titulo-viajes"
            className="text-[clamp(2.25rem,6vw,4rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance"
          >
            Todavía no tenés viajes
          </h1>
          <p className="text-lg">
            Creá tu primer viaje con su moneda y su presupuesto, y empezá a contarle tus gastos al chat.
          </p>
        </div>
        <BotonNuevoViaje texto="Crear mi primer viaje" />
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-viajes" className={`flex w-full max-w-3xl flex-col gap-8 ${ENTRADA}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1
          id="titulo-viajes"
          className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.04em]"
        >
          Mis viajes
        </h1>
        <BotonNuevoViaje texto="Nuevo viaje" />
      </div>
      <ul className="flex flex-col gap-3">
        {viajes.map((viaje) => (
          <li key={viaje.id}>
            <ItemViaje viaje={viaje} />
          </li>
        ))}
      </ul>
    </section>
  );
}
