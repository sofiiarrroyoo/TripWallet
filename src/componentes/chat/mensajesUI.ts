import type { UIMessage } from "ai";
import type { Mensaje } from "@/tipos/mensaje";

// El historial vive en nuestra base; useChat espera mensajes en el formato de la UI, hechos de "partes".
export function aMensajeUI(mensaje: Mensaje): UIMessage {
  return { id: mensaje.id, role: mensaje.rol, parts: [{ type: "text", text: mensaje.contenido }] };
}

export function textoDe(mensaje: UIMessage): string {
  return mensaje.parts.map((parte) => (parte.type === "text" ? parte.text : "")).join("");
}
