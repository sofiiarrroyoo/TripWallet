import { type ModelMessage, type UIMessage, streamText, toUIMessageStream } from "ai";
import { ErrorLimiteExcedido, ErrorSinMensajePendiente } from "@/errores";
import { construirPromptSistema } from "@/ia/promptSistema";
import { AJUSTES_GENERACION, obtenerModelo, obtenerNombreModelo } from "@/integraciones/modeloLLM";
import * as repositorio from "@/repositorios/mensajes";
import type { Mensaje } from "@/tipos/mensaje";
import type { Viaje } from "@/tipos/viaje";
import { esquemaPedidoChat } from "@/validaciones/chat";
import { validar } from "@/validaciones/validar";
import { obtenerViaje } from "./viajes";

export const MENSAJES_AL_MODELO = 20;
export const MENSAJES_VISIBLES = 50;
export const LIMITE_MENSAJES_POR_HORA = 30;

const UNA_HORA_MS = 60 * 60 * 1000;

export async function cargarChat(viajeId: string): Promise<{ viaje: Viaje; mensajes: Mensaje[] }> {
  const viaje = await obtenerViaje(viajeId);
  const mensajes = await repositorio.listarUltimosMensajes(viaje.id, MENSAJES_VISIBLES);
  return { viaje, mensajes };
}

// Cuenta los mensajes del usuario (en todos sus viajes) de la última hora. Si llegó al tope, calcula cuándo se
// libera un lugar: cuando venza el mensaje que lo deja de nuevo por debajo del límite.
async function exigirCupo(): Promise<void> {
  const ahora = Date.now();
  const fechas = await repositorio.listarFechasMensajesUsuarioDesde(new Date(ahora - UNA_HORA_MS));
  if (fechas.length < LIMITE_MENSAJES_POR_HORA) return;

  const queDejaLugar = fechas.at(-LIMITE_MENSAJES_POR_HORA);
  const segundos = queDejaLugar ? Math.ceil((queDejaLugar.getTime() + UNA_HORA_MS - ahora) / 1000) : 60;
  throw new ErrorLimiteExcedido(Math.max(1, segundos));
}

function aMensajeModelo(mensaje: Mensaje): ModelMessage {
  return mensaje.rol === "user"
    ? { role: "user", content: mensaje.contenido }
    : { role: "assistant", content: mensaje.contenido };
}

function textoDe(mensaje: UIMessage): string {
  return mensaje.parts.map((parte) => (parte.type === "text" ? parte.text : "")).join("");
}

type EventoFin = Parameters<NonNullable<Parameters<typeof toUIMessageStream>[0]["onEnd"]>>[0];

// Se guarda la respuesta completa o, si la persona canceló, lo que alcanzó a escribir. Si falló, no se guarda
// nada: el mensaje del usuario queda sin respuesta y se puede reintentar.
function esRespuestaGuardable({ outcome, isAborted, isCancelled }: EventoFin): boolean {
  return outcome.status === "completed" || outcome.status === "aborted" || isAborted || isCancelled === true;
}

type DatosRespuesta = { viajeId: string; idRespuesta: string; nombreModelo: string };

async function guardarRespuesta(
  { viajeId, idRespuesta, nombreModelo }: DatosRespuesta,
  evento: EventoFin,
  uso: () => Promise<{ inputTokens?: number; outputTokens?: number } | undefined>,
): Promise<void> {
  if (!esRespuestaGuardable(evento)) return;
  const contenido = textoDe(evento.responseMessage);
  if (!contenido.trim()) return;

  try {
    // Si se canceló, el uso no está disponible y los tokens quedan en null.
    const tokens = evento.outcome.status === "completed" ? await uso() : undefined;
    await repositorio.crearMensaje({
      id: idRespuesta,
      viajeId,
      rol: "assistant",
      contenido,
      tokensEntrada: tokens?.inputTokens ?? null,
      tokensSalida: tokens?.outputTokens ?? null,
      modelo: nombreModelo,
    });
  } catch (error) {
    // La persona ya vio la respuesta: un fallo al guardarla se registra, pero no corta el stream.
    console.error("No se pudo guardar la respuesta del asistente", error);
  }
}

// Devuelve el stream de la respuesta (la capa de la API lo convierte en una respuesta HTTP).
// Primero se guarda el mensaje del usuario y después se llama al modelo: así el límite por hora cuenta todos los
// pedidos, incluso los cancelados o los que fallan, y lo que escribió la persona nunca se pierde.
export async function responderMensaje(viajeId: string, datos: unknown, senal: AbortSignal) {
  const pedido = validar(esquemaPedidoChat, datos);
  const viaje = await obtenerViaje(viajeId);

  if (pedido.accion === "enviar") {
    await exigirCupo();
    await repositorio.crearMensaje({ viajeId: viaje.id, rol: "user", contenido: pedido.texto });
  }

  const historial = await repositorio.listarUltimosMensajes(viaje.id, MENSAJES_AL_MODELO);
  if (historial.at(-1)?.rol !== "user") throw new ErrorSinMensajePendiente();

  const datosRespuesta: DatosRespuesta = {
    viajeId: viaje.id,
    // El servidor fija el id del mensaje del bot antes de responder: el mismo id lo ve el navegador y queda en la base.
    idRespuesta: crypto.randomUUID(),
    nombreModelo: obtenerNombreModelo(),
  };

  const resultado = streamText({
    model: obtenerModelo(),
    instructions: construirPromptSistema({ viaje, ahora: new Date(), zonaHoraria: pedido.zonaHoraria }),
    messages: historial.map(aMensajeModelo),
    abortSignal: senal,
    ...AJUSTES_GENERACION,
  });

  return toUIMessageStream({
    stream: resultado.stream,
    generateMessageId: () => datosRespuesta.idRespuesta,
    sendReasoning: false,
    // Al navegador llega un mensaje genérico; el detalle queda en el log del servidor.
    onError: (error) => {
      console.error("Falló la respuesta del modelo", error);
      return "El asistente no pudo responder.";
    },
    onEnd: (evento) =>
      guardarRespuesta(datosRespuesta, evento, async () => {
        const uso = await Promise.resolve(resultado.usage).catch(() => undefined);
        return uso && { inputTokens: uso.inputTokens, outputTokens: uso.outputTokens };
      }),
  });
}
