import type { UIMessage } from "ai";
import type { Mensaje } from "@/tipos/mensaje";
import { NOMBRE_TOOL_PEDIR_DATOS, esquemaPedirDatos, textoDePedirDatos } from "@/validaciones/pedirDatos";

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

// Lo que muestra el globo: el texto y, si el bot hizo una pregunta con opciones, la pregunta.
export function textoVisible(mensaje: UIMessage): string {
  const texto = textoDe(mensaje);

  const pregunta = mensaje.parts.find((parte) => parte.type === `tool-${NOMBRE_TOOL_PEDIR_DATOS}`);
  const datos = esquemaPedirDatos.safeParse(pregunta && "input" in pregunta ? pregunta.input : undefined);
  if (!datos.success) return texto;

  return [texto, textoDePedirDatos(datos.data)].filter(Boolean).join("\n\n");
}
