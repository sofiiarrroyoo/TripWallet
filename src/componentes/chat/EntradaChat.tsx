"use client";

import { ArrowUp, Square } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import { cn } from "cn";
import { Button } from "@/componentes/ui/button";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { MAXIMO_CARACTERES_MENSAJE } from "@/validaciones/chat";
import { estadoContador } from "./contadorCaracteres";

type Props = {
  texto: string;
  onCambio: (texto: string) => void;
  onEnviar: () => void;
  onDetener: () => void;
  // Mientras el asistente responde no se puede enviar otro mensaje; el botón pasa a detener la respuesta.
  respondiendo: boolean;
};

export function EntradaChat({ texto, onCambio, onEnviar, onDetener, respondiendo }: Props) {
  const contador = estadoContador(texto);
  const puedeEnviar = !respondiendo && texto.trim().length > 0 && !contador.excedido;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (puedeEnviar) onEnviar();
  }

  // Enter envía y Mayús + Enter agrega una línea; durante una composición (IME) Enter confirma el texto.
  function manejarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key !== "Enter" || evento.shiftKey || evento.nativeEvent.isComposing) return;
    evento.preventDefault();
    if (puedeEnviar) onEnviar();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <Label htmlFor="mensaje-chat" className="sr-only">
        Mensaje para el asistente
      </Label>
      <div className="flex items-end gap-2 rounded-3xl border border-input bg-background p-2 pl-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive">
        <Textarea
          id="mensaje-chat"
          rows={1}
          value={texto}
          onChange={(evento) => onCambio(evento.target.value)}
          onKeyDown={manejarTecla}
          aria-invalid={contador.excedido}
          aria-describedby="ayuda-chat"
          placeholder="Contale algo sobre tu viaje…"
          className="max-h-40 min-h-11 flex-1 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-0 py-2.5 focus-visible:border-0 focus-visible:ring-0 md:text-base"
        />
        {respondiendo ? (
          <Button type="button" onClick={onDetener} aria-label="Detener respuesta" className="size-11 rounded-full">
            <Square aria-hidden className="size-4 fill-current" />
          </Button>
        ) : (
          <Button type="submit" disabled={!puedeEnviar} aria-label="Enviar mensaje" className="size-11 rounded-full">
            <ArrowUp aria-hidden className="size-5" />
          </Button>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 px-4 text-sm text-muted-foreground">
        <p id="ayuda-chat">Enter envía · Mayús + Enter agrega una línea</p>
        <p
          aria-hidden
          className={cn(
            "shrink-0 tabular-nums",
            !contador.visible && "invisible",
            contador.excedido && "font-medium text-destructive",
          )}
        >
          {contador.caracteres}/{MAXIMO_CARACTERES_MENSAJE}
        </p>
      </div>

      {/* El contador se ve siempre, pero solo se anuncia al cruzar un umbral (cambia el texto de esta región). */}
      <p role="status" className="sr-only">
        {contador.aviso}
      </p>
    </form>
  );
}
