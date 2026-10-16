"use client";

import { ChartPie, ChevronLeft, ChevronRight, X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "cn";
import { Button } from "@/componentes/ui/button";

type Valor = {
  // En escritorio el panel está al costado y se puede minimizar; en celular es una hoja que se abre desde la barra.
  escritorioVisible: boolean;
  movilAbierto: boolean;
  alternarEscritorio: () => void;
  abrirMovil: () => void;
  cerrarMovil: () => void;
  botonMovil: RefObject<HTMLButtonElement | null>;
};

const ContextoPanel = createContext<Valor | null>(null);

function usePanel(): Valor {
  const valor = useContext(ContextoPanel);
  if (!valor) throw new Error("Falta el ProveedorPanel");
  return valor;
}

export function ProveedorPanel({ children }: { children: ReactNode }) {
  const [escritorioVisible, setEscritorioVisible] = useState(true);
  const [movilAbierto, setMovilAbierto] = useState(false);
  const botonMovil = useRef<HTMLButtonElement>(null);

  return (
    <ContextoPanel
      value={{
        escritorioVisible,
        movilAbierto,
        alternarEscritorio: () => setEscritorioVisible((visible) => !visible),
        abrirMovil: () => setMovilAbierto(true),
        cerrarMovil: () => setMovilAbierto(false),
        botonMovil,
      }}
    >
      {children}
    </ContextoPanel>
  );
}

// Solo se ve en celular y tablet: desde lg el panel ya está al costado.
export function BotonVerEstadisticas() {
  const { abrirMovil, movilAbierto, botonMovil } = usePanel();
  return (
    <Button
      ref={botonMovil}
      type="button"
      variant="outline"
      onClick={abrirMovil}
      aria-label="Ver estadísticas"
      aria-expanded={movilAbierto}
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
// completa, desde lg es una columna a la derecha del chat con una flecha para minimizarla.
export function PanelColapsable({ children }: { children: ReactNode }) {
  const { escritorioVisible, movilAbierto, alternarEscritorio, cerrarMovil, botonMovil } = usePanel();
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);

  // La hoja abre con el foco en "Cerrar" y, al cerrarse, devuelve el foco al botón que la abrió.
  useEffect(() => {
    if (movilAbierto) botonCerrar.current?.focus();
    else if (estabaAbierto.current) botonMovil.current?.focus();
    estabaAbierto.current = movilAbierto;
  }, [movilAbierto, botonMovil]);

  return (
    <aside
      id="panel-estadisticas"
      aria-label="Estadísticas del viaje"
      onKeyDown={(evento) => {
        if (evento.key === "Escape" && movilAbierto) cerrarMovil();
      }}
      className={cn(
        "@container fixed inset-0 z-50 flex-col bg-background lg:static lg:z-auto lg:flex lg:border-l lg:bg-secondary/60",
        movilAbierto ? "flex" : "hidden",
        escritorioVisible ? "lg:min-w-[26rem] lg:flex-[9]" : "lg:w-12 lg:shrink-0",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b bg-barra px-5 py-3 lg:hidden">
        <h2 className="text-lg font-semibold tracking-tight">Estadísticas</h2>
        <Button
          ref={botonCerrar}
          type="button"
          variant="outline"
          onClick={cerrarMovil}
          aria-label="Cerrar estadísticas"
          className="size-10 rounded-full p-0"
        >
          <X aria-hidden />
        </Button>
      </div>

      <button
        type="button"
        onClick={alternarEscritorio}
        aria-expanded={escritorioVisible}
        aria-controls="contenido-panel"
        aria-label={escritorioVisible ? "Minimizar estadísticas" : "Mostrar estadísticas"}
        className="absolute top-4 -left-4 z-10 hidden size-8 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:flex"
      >
        {escritorioVisible ? <ChevronRight aria-hidden className="size-4" /> : <ChevronLeft aria-hidden className="size-4" />}
      </button>

      <div
        id="contenido-panel"
        className={cn("min-h-0 flex-1 overflow-y-auto p-5 lg:p-6", !escritorioVisible && "lg:hidden")}
      >
        {children}
      </div>
    </aside>
  );
}
