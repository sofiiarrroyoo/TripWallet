import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonCerrarSesion } from "@/componentes/autenticacion/BotonCerrarSesion";
import { RUTA_INGRESAR, RUTA_INICIO_PRIVADO } from "@/lib/rutas";
import { obtenerUsuarioActual } from "@/servicios/autenticacion";

export default async function LayoutPrivado({ children }: LayoutProps<"/">) {
  const usuario = await obtenerUsuarioActual();
  // El proxy ya protege estas rutas; esto es un respaldo por si el matcher cambia.
  if (!usuario) redirect(RUTA_INGRESAR);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link href={RUTA_INICIO_PRIVADO} className="text-lg font-semibold tracking-tight">
          TripWallet
        </Link>
        <div className="flex items-center gap-4">
          <p className="hidden text-sm text-muted-foreground sm:block">
            <span className="sr-only">Sesión iniciada como </span>
            {usuario.email}
          </p>
          <BotonCerrarSesion />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-5 pt-[8vh] pb-16 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
