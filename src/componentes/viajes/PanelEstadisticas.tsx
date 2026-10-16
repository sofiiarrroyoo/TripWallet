"use client";

import { ChartPie, X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "cn";
import { Button } from "@/componentes/ui/button";

type Valor = {
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  botonAbrir: RefObject<HTMLButtonElement | null>;
};

const ContextoPanel = createContext<Valor | null>(null);

function usePanel(): Valor {
  const valor = useContext(ContextoPanel);
  if (!valor) throw new Error("Falta el ProveedorPanel");
  return valor;
}

// El botón vive en la barra del viaje y la hoja en la página: el estado se comparte por contexto.
export function ProveedorPanel({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const botonAbrir = useRef<HTMLButtonElement>(null);

  return (
    <ContextoPanel value={{ abierto, abrir: () => setAbierto(true), cerrar: () => setAbierto(false), botonAbrir }}>
      {children}
    </ContextoPanel>
  );
}

// Solo se ve en celular y tablet: desde lg el panel ya está al costado del chat.
export function BotonVerEstadisticas() {
  const { abrir, abierto, botonAbrir } = usePanel();
  return (
    <Button
      ref={botonAbrir}
      type="button"
      variant="outline"
      onClick={abrir}
      aria-label="Ver estadísticas"
      aria-expanded={abierto}
      aria-controls="panel-estadisticas"
      className="h-10 rounded-full px-3 sm:px-4 lg:hidden"
    >
      <ChartPie aria-hidden />
      <span aria-hidden className="hidden sm:inline">
        Estadísticas
      </span>
    </Button>
  );
}

// Un solo contenedor para los dos usos (así los números y los ids no se duplican): en celular es una hoja a pantalla
// completa que abre el botón de la barra; desde lg es la columna a la derecha del chat.
export function ContenedorPanel({ children }: { children: ReactNode }) {
  const { abierto, cerrar, botonAbrir } = usePanel();
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);

  // La hoja abre con el foco en "Cerrar" y, al cerrarse, devuelve el foco al botón que la abrió.
  useEffect(() => {
    if (abierto) botonCerrar.current?.focus();
    else if (estabaAbierto.current) botonAbrir.current?.focus();
    estabaAbierto.current = abierto;
  }, [abierto, botonAbrir]);

  return (
    <aside
      id="panel-estadisticas"
      aria-label="Estadísticas del viaje"
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && abierto) cerrar();
      }}
      className={cn(
        "@container fixed inset-0 z-50 flex-col bg-background lg:static lg:z-auto lg:flex lg:min-w-[26rem] lg:flex-[9] lg:border-l lg:bg-secondary/60",
        abierto ? "flex" : "hidden",
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-barra px-5 py-3 lg:hidden">
        <h2 className="text-lg font-semibold tracking-tight">Estadísticas</h2>
        <Button
          ref={botonCerrar}
          type="button"
          variant="outline"
          onClick={cerrar}
          aria-label="Cerrar estadísticas"
          className="size-10 rounded-full p-0"
        >
          <X aria-hidden />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">{children}</div>
    </aside>
  );
}
