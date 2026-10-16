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
export function EncabezadoPagina({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "corte-diagonal bg-escenario pt-20 pb-10 text-escenario-foreground lg:pt-28 lg:pb-14",
        MARGENES_PAGINA,
        className,
      )}
    >
      <div className={cn("flex max-w-3xl flex-col gap-4", ENTRADA)}>{children}</div>
    </div>
  );
}

export function CuerpoPagina({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("pt-10", MARGENES_PAGINA, ENTRADA, "delay-150 fill-mode-both", className)}>
      <div className="flex max-w-3xl flex-col gap-8">{children}</div>
    </div>
  );
}

export function EnlaceVolver({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 self-start font-medium underline-offset-4 hover:underline">
      <ArrowLeft aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

export const CLASES_TITULO_PAGINA =
  "text-[clamp(2.25rem,5vw,3.75rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-balance";
