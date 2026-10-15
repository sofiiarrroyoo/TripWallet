"use client";

import { LoaderCircle, Lock, LockOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/componentes/ui/button";
import { llamarApi, sinDatos } from "@/lib/llamarApi";
import type { EstadoViaje } from "@/tipos/viaje";

type Props = { viajeId: string; estado: EstadoViaje };

const TEXTOS = {
  abierto: {
    boton: "Cerrar viaje",
    pregunta: "¿Cerramos el viaje? Se arma el resumen y queda en solo lectura, pero lo podés reabrir cuando quieras.",
    confirmar: "Sí, cerrar viaje",
    enCurso: "Cerrando el viaje… puede tardar unos segundos.",
    listo: "Viaje cerrado. El resumen aparece más abajo.",
    metodo: "POST",
  },
  cerrado: {
    boton: "Reabrir viaje",
    pregunta: "¿Reabrimos el viaje? Se borra el resumen y vas a poder registrar y borrar gastos de nuevo.",
    confirmar: "Sí, reabrir viaje",
    enCurso: "Reabriendo el viaje…",
    listo: "Viaje reabierto. Ya podés registrar gastos.",
    metodo: "DELETE",
  },
} as const;

// Cerrar y reabrir el viaje, con una confirmación antes (cerrar es reversible, pero reabrir borra el resumen). No pasa
// por el chat ni por el modelo: llama directo a la API y después recarga la página.
export function AccionesViaje({ viajeId, estado }: Props) {
  const router = useRouter();
  const textos = TEXTOS[estado];
  const [confirmando, setConfirmando] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const panel = useRef<HTMLDivElement>(null);

  // Al aparecer la confirmación el botón desaparece: el foco pasa al panel para que no se pierda.
  useEffect(() => {
    if (confirmando) panel.current?.focus();
  }, [confirmando]);

  async function confirmar() {
    setEnCurso(true);
    setError(null);
    setAviso("");

    const resultado = await llamarApi(`/api/viajes/${encodeURIComponent(viajeId)}/cierre`, sinDatos, {
      metodo: textos.metodo,
    });
    setEnCurso(false);

    if (!resultado.ok) {
      setError(resultado.error.mensaje);
      return;
    }
    setConfirmando(false);
    setAviso(textos.listo);
    router.refresh();
  }

  function cancelar() {
    setConfirmando(false);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {confirmando ? (
        <div
          ref={panel}
          tabIndex={-1}
          role="group"
          aria-label={textos.boton}
          onKeyDown={(evento) => {
            if (evento.key === "Escape" && !enCurso) cancelar();
          }}
          className="flex flex-col gap-3 rounded-md bg-muted p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <p>{textos.pregunta}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={confirmar} disabled={enCurso} className="h-10 rounded-full px-4">
              {enCurso && <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
              {textos.confirmar}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={cancelar}
              disabled={enCurso}
              className="h-10 rounded-full px-4"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmando(true)}
          className="h-10 self-start rounded-full px-4"
        >
          {estado === "abierto" ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
          {textos.boton}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Región siempre presente: los lectores de pantalla solo anuncian cambios en regiones que ya existían. */}
      <p role="status" className="sr-only">
        {enCurso ? textos.enCurso : aviso}
      </p>
      {enCurso && (
        <p aria-hidden className="text-sm text-muted-foreground">
          {textos.enCurso}
        </p>
      )}
    </div>
  );
}
