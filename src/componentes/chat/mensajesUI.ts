import type { UIMessage } from "ai";
import type { GastoRegistrado } from "@/tipos/gasto";
import type { Mensaje } from "@/tipos/mensaje";
import { esquemaResultadoEliminacion, esquemaResultadoRegistro } from "@/validaciones/gastos";
import { NOMBRE_TOOL_PEDIR_DATOS, type PedirDatos, esquemaPedirDatos } from "@/validaciones/pedirDatos";

// El historial vive en nuestra base; useChat espera mensajes en el formato de la UI, hechos de "partes". Las tools
// guardadas en el mensaje vuelven a ser partes ya resueltas, igual que cuando llegaron por el stream.
export function aMensajeUI(mensaje: Mensaje): UIMessage {
  const partesDeTools = mensaje.llamadasTools.map((llamada, indice) => ({
    type: `tool-${llamada.nombre}`,
    toolCallId: `${mensaje.id}-${indice}`,
    state: "output-available",
    input: llamada.argumentos,
    output: llamada.resultado,
  }));
  const partesDeTexto = mensaje.contenido ? [{ type: "text", text: mensaje.contenido }] : [];

  return { id: mensaje.id, role: mensaje.rol, parts: [...partesDeTools, ...partesDeTexto] as UIMessage["parts"] };
}

// Solo el texto escrito (lo que se manda al servidor cuando es un mensaje de la persona).
export function textoDe(mensaje: UIMessage): string {
  return mensaje.parts.map((parte) => (parte.type === "text" ? parte.text : "")).join("");
}

function partesDeTool(mensaje: UIMessage, nombre: string) {
  return mensaje.parts.filter((parte) => parte.type === `tool-${nombre}`);
}

function propiedad(parte: unknown, nombre: "input" | "output"): unknown {
  return typeof parte === "object" && parte !== null && nombre in parte
    ? (parte as Record<string, unknown>)[nombre]
    : undefined;
}

// La pregunta con opciones que hizo el bot en este mensaje, si hizo una (y está bien formada).
export function preguntaPendienteDe(mensaje: UIMessage): PedirDatos | null {
  const parte = partesDeTool(mensaje, NOMBRE_TOOL_PEDIR_DATOS)[0];
  const datos = esquemaPedirDatos.safeParse(propiedad(parte, "input"));
  return datos.success ? datos.data : null;
}

// Los gastos que registró este mensaje: cada uno se muestra como una tarjeta.
export function gastosRegistradosDe(mensaje: UIMessage): GastoRegistrado[] {
  return partesDeTool(mensaje, "registrar_gasto").flatMap((parte) => {
    const resultado = esquemaResultadoRegistro.safeParse(propiedad(parte, "output"));
    return resultado.success ? [resultado.data.gasto] : [];
  });
}

// Gastos que el bot borró ("borrá el último"): su tarjeta tiene que pasar a decir "Gasto eliminado".
export function idsDeGastosEliminadosPorElChat(mensajes: UIMessage[]): string[] {
  return mensajes
    .flatMap((mensaje) => partesDeTool(mensaje, "eliminar_gasto"))
    .flatMap((parte) => {
      const resultado = esquemaResultadoEliminacion.safeParse(propiedad(parte, "output"));
      return resultado.success ? [resultado.data.gasto.id] : [];
    });
}

// Lo que dice el globo: el texto y, si el bot hizo una pregunta, la pregunta (las opciones son botones aparte).
export function textoVisible(mensaje: UIMessage): string {
  return [textoDe(mensaje), preguntaPendienteDe(mensaje)?.pregunta].filter(Boolean).join("\n\n");
}
