"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/componentes/ui/button";
import { llamarApi, sinDatos } from "@/lib/llamarApi";
import { RUTA_INGRESAR } from "@/lib/rutas";

export function BotonCerrarSesion() {
  const router = useRouter();
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cerrarSesion() {
    setCerrando(true);
    setError(null);

    const resultado = await llamarApi("/api/auth/sesion", sinDatos, { metodo: "DELETE" });
    if (resultado.ok) {
      // replace: que "atrás" no vuelva a una página privada.
      router.replace(RUTA_INGRESAR);
      router.refresh();
      return;
    }

    setCerrando(false);
    setError(resultado.error.mensaje);
  }

  return (
    <div className="flex items-center gap-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button variant="secondary" onClick={cerrarSesion} disabled={cerrando} className="h-10 px-4">
        {cerrando && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
        {cerrando ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
    </div>
  );
}
