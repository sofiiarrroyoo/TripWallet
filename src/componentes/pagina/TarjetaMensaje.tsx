import type { ReactNode } from "react";

// Tarjeta para estados sin contenido o de falla (error, página no encontrada): ícono, título, texto y una acción.
export function TarjetaMensaje({
  icono,
  titulo,
  children,
  accion,
}: {
  icono: ReactNode;
  titulo: string;
  children: ReactNode;
  accion: ReactNode;
}) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
      <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {icono}
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <p className="text-lg">{children}</p>
      {accion}
    </div>
  );
}
