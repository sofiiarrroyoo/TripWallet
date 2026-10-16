import { Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MARGENES_PAGINA } from "@/componentes/pagina/Pagina";
import { TarjetaMensaje } from "@/componentes/pagina/TarjetaMensaje";
import { Button } from "@/componentes/ui/button";
import { RUTA_INICIO_PRIVADO } from "@/lib/rutas";

export const metadata: Metadata = { title: "No encontrado" };

// Se muestra para cualquier ruta que no existe y cuando una página llama a notFound() (por ejemplo, un viaje ajeno).
export default function NoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className={`flex h-16 items-center ${MARGENES_PAGINA}`}>
        <p className="text-lg font-semibold tracking-tight">TripWallet</p>
      </header>
      <main className={`pt-10 ${MARGENES_PAGINA}`}>
        <TarjetaMensaje
          icono={<Compass className="size-6" />}
          titulo="No encontramos esta página"
          accion={
            <Button asChild className="h-11 px-5 text-base">
              <Link href={RUTA_INICIO_PRIVADO}>Volver a mis viajes</Link>
            </Button>
          }
        >
          Puede que el viaje ya no exista o que el enlace esté mal escrito.
        </TarjetaMensaje>
      </main>
    </div>
  );
}
