"use client";

import { useChat } from "@ai-sdk/react";
import { APICallError, DefaultChatTransport, type UIMessage } from "ai";
import { CircleAlert, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/componentes/ui/alert";
import { Button } from "@/componentes/ui/button";
import { actividadDelAsistente } from "./actividadDelAsistente";
import { EntradaChat } from "./EntradaChat";
import { GloboMensaje } from "./GloboMensaje";
import { IndicadorActividad } from "./IndicadorActividad";
import { mensajeDeError } from "./mensajeDeError";
import { textoDe, textoVisible } from "./mensajesUI";

type Props = {
  viajeId: string;
  destino: string;
  viajeCerrado: boolean;
  mensajesIniciales: UIMessage[];
};

type Accion = "enviar" | "reintentar";

// Un error de red o una respuesta HTTP de error llegan antes de que el servidor guarde el mensaje; un error
// dentro del stream llega después, con el mensaje del usuario ya guardado y sin respuesta.
function fallaAntesDeGuardar(error: unknown): boolean {
  return APICallError.isInstance(error) || error instanceof TypeError;
}

export function ChatViaje({ viajeId, destino, viajeCerrado, mensajesIniciales }: Props) {
  const [texto, setTexto] = useState("");
  const [puedeReintentar, setPuedeReintentar] = useState(false);
  const accionEnCurso = useRef<Accion>("enviar");
  const mensajesActuales = useRef<UIMessage[]>(mensajesIniciales);
  const alFallar = useRef<(error: Error) => void>(() => {});
  const pegadoAlFinal = useRef(true);
  const finDeLaPagina = useRef<HTMLDivElement>(null);

  // El navegador manda solo el texto nuevo y su zona horaria: el historial y el viaje los pone el servidor.
  const transporte = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/viajes/${viajeId}/chat`,
        prepareSendMessagesRequest: ({ messages, trigger }) => {
          const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const ultimo = messages.at(-1);
          if (trigger === "regenerate-message" || !ultimo) return { body: { accion: "reintentar", zonaHoraria } };
          return { body: { accion: "enviar", texto: textoDe(ultimo), zonaHoraria } };
        },
      }),
    [viajeId],
  );

  const { messages, sendMessage, regenerate, stop, setMessages, status, error } = useChat({
    id: viajeId,
    messages: mensajesIniciales,
    transport: transporte,
    onError: (falla) => alFallar.current(falla),
  });

  useEffect(() => {
    mensajesActuales.current = messages;
    alFallar.current = (falla) => {
      const guardado = !fallaAntesDeGuardar(falla);
      if (accionEnCurso.current === "reintentar") {
        // Un 4xx (por ejemplo "no hay mensaje pendiente") no se arregla reintentando.
        setPuedeReintentar(!(APICallError.isInstance(falla) && (falla.statusCode ?? 500) < 500));
        return;
      }
      if (guardado) {
        setPuedeReintentar(true);
        return;
      }
      // El mensaje nunca llegó a guardarse: se devuelve el texto al cuadro para poder enviarlo de nuevo.
      const ultimo = mensajesActuales.current.at(-1);
      if (ultimo?.role !== "user") return;
      setTexto((actual) => actual || textoDe(ultimo));
      setMessages((anteriores) => anteriores.slice(0, -1));
    };
  });

  useEffect(() => {
    function alDesplazar() {
      pegadoAlFinal.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
    }
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  // Sigue la conversación hacia abajo, salvo que la persona haya subido a leer algo anterior.
  useEffect(() => {
    if (messages.length > 0 && pegadoAlFinal.current) finDeLaPagina.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function enviarTexto() {
    const mensaje = texto.trim();
    if (!mensaje) return;
    accionEnCurso.current = "enviar";
    pegadoAlFinal.current = true;
    setPuedeReintentar(false);
    setTexto("");
    void sendMessage({ text: mensaje });
  }

  function reintentar() {
    accionEnCurso.current = "reintentar";
    pegadoAlFinal.current = true;
    setPuedeReintentar(false);
    void regenerate();
  }

  const respondiendo = status === "submitted" || status === "streaming";
  const actividad = actividadDelAsistente(status, messages.at(-1));
  const mensajesVisibles = messages.filter((mensaje) => textoVisible(mensaje) !== "");

  return (
    <section aria-label="Chat del viaje" className="flex flex-col gap-4">
      {mensajesVisibles.length === 0 && !respondiendo && (
        <div className="flex flex-col gap-1 rounded-2xl bg-muted p-6">
          <p className="text-lg font-medium">Este es el chat de tu viaje a {destino}</p>
          <p>Contale cómo va el viaje y preguntame lo que necesites.</p>
        </div>
      )}

      <div
        role="log"
        aria-label="Conversación"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={respondiendo}
        className="flex flex-col gap-3"
      >
        {mensajesVisibles.map((mensaje) => (
          <GloboMensaje key={mensaje.id} rol={mensaje.role === "user" ? "user" : "assistant"} texto={textoVisible(mensaje)} />
        ))}
        {actividad && <IndicadorActividad etiqueta={actividad} />}
      </div>

      {/* Lo que está haciendo el asistente, para lectores de pantalla (el indicador visual es aria-hidden). */}
      <p role="status" className="sr-only">
        {actividad ?? ""}
      </p>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
          <CircleAlert aria-hidden />
          <AlertDescription className="flex flex-col items-start gap-3">
            <p>{mensajeDeError(error)}</p>
            {puedeReintentar && (
              <Button variant="secondary" onClick={reintentar} className="h-10 bg-background px-4">
                <RotateCw aria-hidden />
                Reintentar
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="sticky bottom-0 flex flex-col gap-2 bg-background pt-3 pb-4">
        {viajeCerrado && <p className="px-4 text-sm text-muted-foreground">Este viaje está cerrado: solo podés hacer consultas.</p>}
        <EntradaChat texto={texto} onCambio={setTexto} onEnviar={enviarTexto} onDetener={stop} respondiendo={respondiendo} />
      </div>
      <div ref={finDeLaPagina} />
    </section>
  );
}
