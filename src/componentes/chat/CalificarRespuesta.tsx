"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/componentes/ui/button";
import { llamarApi, sinDatos } from "@/lib/llamarApi";
import type { ValorCalificacion } from "@/validaciones/calificaciones";

type Props = {
  viajeId: string;
  mensajeId: string;
  calificacionInicial: ValorCalificacion | null;
  // Mientras el bot escribe, la respuesta todavía no está guardada y no se puede calificar.
  habilitado: boolean;
};

const OPCIONES = [
  { valor: 1, Icono: ThumbsUp, etiqueta: "Esta respuesta me sirvió" },
  { valor: -1, Icono: ThumbsDown, etiqueta: "Esta respuesta no me sirvió" },
] as const;

// Los pulgares de una respuesta del bot. Cada uno es un botón de dos estados (aria-pressed). Tocar el que ya está
// marcado no hace nada; para cambiar la calificación se toca el otro. No pasa por el modelo: va directo a la API.
export function CalificarRespuesta({ viajeId, mensajeId, calificacionInicial, habilitado }: Props) {
  const [calificacion, setCalificacion] = useState(calificacionInicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState("");

  async function calificar(valor: ValorCalificacion) {
    if (valor === calificacion || enviando) return;
    setEnviando(true);
    setError(null);

    const resultado = await llamarApi(
      `/api/viajes/${encodeURIComponent(viajeId)}/mensajes/${encodeURIComponent(mensajeId)}/calificacion`,
      sinDatos,
      { metodo: "PUT", cuerpo: { valor } },
    );
    setEnviando(false);

    if (!resultado.ok) {
      setError(resultado.error.mensaje);
      return;
    }
    setCalificacion(valor);
    setAnuncio("Gracias por tu calificación.");
  }

  return (
    <div className="flex flex-col gap-1">
      <div role="group" aria-label="Calificar esta respuesta" className="flex gap-1">
        {OPCIONES.map(({ valor, Icono, etiqueta }) => (
          <Button
            key={valor}
            type="button"
            variant="ghost"
            onClick={() => calificar(valor)}
            disabled={!habilitado || enviando}
            aria-pressed={calificacion === valor}
            aria-label={etiqueta}
            className="size-10 rounded-full p-0 aria-pressed:bg-foreground aria-pressed:text-background aria-pressed:hover:bg-foreground"
          >
            <Icono aria-hidden />
          </Button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Región siempre presente: los lectores de pantalla solo anuncian cambios en regiones que ya existían. */}
      <p role="status" className="sr-only">
        {anuncio}
      </p>
    </div>
  );
}
