"use client";

import { Bug } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/componentes/ui/button";

type Valor = { activo: boolean; alternar: () => void };

const ContextoModoDebug = createContext<Valor>({ activo: false, alternar: () => {} });

// El botón vive en la barra del viaje y el detalle en el chat: el estado se comparte por contexto.
export function ProveedorModoDebug({ children }: { children: ReactNode }) {
  const [activo, setActivo] = useState(false);
  return (
    <ContextoModoDebug value={{ activo, alternar: () => setActivo((anterior) => !anterior) }}>
      {children}
    </ContextoModoDebug>
  );
}

export function useModoDebug(): Valor {
  return useContext(ContextoModoDebug);
}

export function BotonModoDebug() {
  const { activo, alternar } = useModoDebug();
  return (
    <Button
      type="button"
      variant="outline"
      onClick={alternar}
      aria-pressed={activo}
      aria-label="Modo debug"
      className="h-10 rounded-full px-3 aria-pressed:bg-accent aria-pressed:text-accent-foreground aria-pressed:hover:bg-accent sm:px-4"
    >
      <Bug aria-hidden />
      <span aria-hidden className="hidden sm:inline">
        Modo debug
      </span>
    </Button>
  );
}
