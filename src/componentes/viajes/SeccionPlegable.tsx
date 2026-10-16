import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

// Tarjeta del panel que se minimiza con su flechita. Usa <details>: el teclado (Enter o Espacio) y los lectores de
// pantalla funcionan sin código extra.
export function SeccionPlegable({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details open className="group rounded-2xl bg-card ring-1 ring-foreground/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <h2 className="font-medium">{titulo}</h2>
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}
