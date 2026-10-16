import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "cn";

// Los mismos márgenes laterales que la barra superior del layout privado.
export const MARGENES_PAGINA = "px-5 sm:px-8 lg:px-10";

// Alto fijo de la barra superior: la página del viaje lo resta para ocupar justo el resto de la pantalla.
export const ALTO_CABECERA = "h-16";

const ENTRADA = "animate-in fade-in slide-in-from-bottom-4 animation-duration-500 motion-reduce:animate-none";

// Campo menta a todo el ancho con la esquina cortada, el mismo recurso que el panel del ingreso. Sobre la menta
// todo el texto va en el color de tinta (el gris no llega al contraste AA).
export function EncabezadoPagina({
  children,
  className,
  ancho = "max-w-3xl",
  compacto = false,
}: {
  children: ReactNode;
  className?: string;
  // Clase de ancho máximo del contenido (para alinearlo con un cuerpo más ancho).
  ancho?: string;
  compacto?: boolean;
}) {
  return (
    <div
      className={cn(
        "corte-diagonal bg-escenario text-escenario-foreground",
        compacto ? "pt-16 pb-8 lg:pt-16 lg:pb-8" : "pt-20 pb-10 lg:pt-28 lg:pb-14",
        MARGENES_PAGINA,
        className,
      )}
    >
      <div className={cn("flex flex-col gap-4", ancho, ENTRADA)}>{children}</div>
    </div>
  );
}

export function CuerpoPagina({
  children,
  className,
  ancho = "max-w-3xl",
}: {
  children: ReactNode;
  className?: string;
  ancho?: string;
}) {
  return (
    <div className={cn("pt-10", MARGENES_PAGINA, ENTRADA, "delay-150 fill-mode-both", className)}>
      <div className={cn("flex flex-col gap-8", ancho)}>{children}</div>
    </div>
  );
}

export function EnlaceVolver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex h-10 items-center gap-2 self-start rounded-full border bg-background px-4 font-medium hover:bg-muted">
      <ArrowLeft aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

export const CLASES_TITULO_PAGINA =
  "text-[clamp(2.25rem,5vw,3.75rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance";
