import {
  type ModelMessage,
  type UIMessage,
  getToolName,
  hasToolCall,
  isStepCount,
  isToolUIPart,
  streamText,
  toUIMessageStream,
} from "ai";
import { ErrorLimiteExcedido, ErrorSinMensajePendiente } from "@/errores";
import { construirPromptSistema } from "@/ia/promptSistema";
import { contextoDeTools, tools } from "@/ia/tools";
import { AJUSTES_GENERACION, obtenerModelo, obtenerNombreModelo } from "@/integraciones/modeloLLM";
import { fechaIsoEn } from "@/lib/fechas";
import * as repositorio from "@/repositorios/mensajes";
import type { Mensaje } from "@/tipos/mensaje";
import type { Viaje } from "@/tipos/viaje";
import type { ValorCalificacion } from "@/validaciones/calificaciones";
import { esquemaPedidoChat } from "@/validaciones/chat";
import { esquemaResultadoRegistro } from "@/validaciones/gastos";
import { type LlamadaTool, esquemaLlamadasTools } from "@/validaciones/mensajes";
import { NOMBRE_TOOL_PEDIR_DATOS, esquemaPedirDatos, textoDePedirDatos } from "@/validaciones/pedirDatos";
import { validar } from "@/validaciones/validar";
import { obtenerCalificaciones } from "./calificaciones";
import { listarCategorias } from "./categorias";
import { obtenerIdsGastosEliminados } from "./gastos";
import { obtenerViaje } from "./viajes";

export const MENSAJES_AL_MODELO = 20;
export const MENSAJES_VISIBLES = 50;
export const LIMITE_MENSAJES_POR_HORA = 30;
// Cuántas veces puede el modelo llamar a tools y volver a mirar los resultados dentro de un mismo mensaje.
const MAXIMO_PASOS = 5;

const UNA_HORA_MS = 60 * 60 * 1000;

// Los gastos que mostró el chat con una tarjeta: se rearman desde las llamadas a tools guardadas en los mensajes.
function idsDeGastosMostrados(mensajes: Mensaje[]): string[] {
  return mensajes
    .flatMap((mensaje) => mensaje.llamadasTools)
    .filter((llamada) => llamada.nombre === "registrar_gasto")
    .flatMap((llamada) => {
      const resultado = esquemaResultadoRegistro.safeParse(llamada.resultado);
      return resultado.success ? [resultado.data.gasto.id] : [];
    });
}

export type ChatCargado = {
  viaje: Viaje;
  mensajes: Mensaje[];
  // Gastos que tuvieron tarjeta y ya no existen: la tarjeta tiene que decir "Gasto eliminado".
  gastosEliminados: string[];
  // La calificación (1 o -1) de las respuestas del bot que la persona ya calificó, por id de mensaje.
  calificaciones: Record<string, ValorCalificacion>;
};

export async function cargarChat(viajeId: string): Promise<ChatCargado> {
  const viaje = await obtenerViaje(viajeId);
  const mensajes = await repositorio.listarUltimosMensajes(viaje.id, MENSAJES_VISIBLES);
  const gastosEliminados = await obtenerIdsGastosEliminados(viaje.id, idsDeGastosMostrados(mensajes));
  const respuestasDelBot = mensajes.filter((mensaje) => mensaje.rol === "assistant").map((mensaje) => mensaje.id);
  const calificaciones = await obtenerCalificaciones(respuestasDelBot);
  return { viaje, mensajes, gastosEliminados, calificaciones };
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

// El historial que ve el modelo es solo texto. Una respuesta que fue únicamente una pregunta con opciones
// (pedir_datos) no tiene texto propio, así que se la representa con la pregunta para que el modelo sepa qué se le preguntó
// a la persona cuando llega su respuesta.
function textoParaElModelo(mensaje: Mensaje): string {
  if (mensaje.contenido.trim() !== "") return mensaje.contenido;

  const pedido = mensaje.llamadasTools.find((llamada) => llamada.nombre === NOMBRE_TOOL_PEDIR_DATOS);
  const datos = esquemaPedirDatos.safeParse(pedido?.argumentos);
  return datos.success ? textoDePedirDatos(datos.data) : mensaje.contenido;
}

function aMensajeModelo(mensaje: Mensaje): ModelMessage {
  const contenido = textoParaElModelo(mensaje);
  return mensaje.rol === "user" ? { role: "user", content: contenido } : { role: "assistant", content: contenido };
}

function textoDe(mensaje: UIMessage): string {
  return mensaje.parts.map((parte) => (parte.type === "text" ? parte.text : "")).join("");
}

// Las llamadas a tools que ya terminaron, para guardarlas en el mensaje y poder rearmar las tarjetas del chat.
function llamadasDeTools(mensaje: UIMessage): LlamadaTool[] {
  const llamadas: LlamadaTool[] = [];
  for (const parte of mensaje.parts) {
    if (!isToolUIPart(parte)) continue;

    let resultado: unknown;
    if (parte.state === "output-available") resultado = parte.output;
    else if (parte.state === "output-error") resultado = { ok: false, mensaje: parte.errorText };
    else continue; // La llamada no llegó a completarse (por ejemplo, la persona canceló en el medio).

    const llamada = esquemaLlamadasTools.element.safeParse({
      nombre: getToolName(parte),
      argumentos: parte.input ?? null,
      resultado,
    });
    if (llamada.success) llamadas.push(llamada.data);
  }
  return llamadas;
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
  const llamadasTools = llamadasDeTools(evento.responseMessage);
  // Una respuesta puede no tener texto y ser solo una tarjeta o una pregunta con opciones.
  if (!contenido.trim() && llamadasTools.length === 0) return;

  try {
    // Si se canceló, el uso no está disponible y los tokens quedan en null.
    const tokens = evento.outcome.status === "completed" ? await uso() : undefined;
    await repositorio.crearMensaje({
      id: idRespuesta,
      viajeId,
      rol: "assistant",
      contenido,
      llamadasTools,
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

  const categorias = await listarCategorias();
  const ahora = new Date();

  const datosRespuesta: DatosRespuesta = {
    viajeId: viaje.id,
    // El servidor fija el id del mensaje del bot antes de responder: el mismo id lo ve el navegador y queda en la base.
    idRespuesta: crypto.randomUUID(),
    nombreModelo: obtenerNombreModelo(),
  };

  const resultado = streamText({
    model: obtenerModelo(),
    instructions: construirPromptSistema({ viaje, categorias, ahora, zonaHoraria: pedido.zonaHoraria }),
    messages: historial.map(aMensajeModelo),
    tools,
    // El viaje y la fecha de hoy los pone el servidor: el modelo no puede elegir sobre qué viaje trabajan las tools.
    toolsContext: contextoDeTools({
      viajeId: viaje.id,
      monedaBase: viaje.monedaBase,
      hoy: fechaIsoEn(ahora, pedido.zonaHoraria),
    }),
    // Después de hacer una pregunta con opciones el turno termina: se espera la respuesta de la persona.
    stopWhen: [isStepCount(MAXIMO_PASOS), hasToolCall(NOMBRE_TOOL_PEDIR_DATOS)],
    abortSignal: senal,
    ...AJUSTES_GENERACION,
  });

  return toUIMessageStream({
    stream: resultado.stream,
    tools,
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
