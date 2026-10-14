import { z } from "zod";

// Lo que el bot le pide a la persona con la tool pedir_datos. Está acá, sin código de servidor, porque lo usan
// las tools, el armado del historial para el modelo y la interfaz del chat.
export const esquemaPedirDatos = z.object({
  pregunta: z.string().describe("La pregunta, en una frase."),
  opciones: z.array(z.string()).min(2).max(6).describe("Opciones de respuesta, cortas."),
});

export type PedirDatos = z.infer<typeof esquemaPedirDatos>;

export const NOMBRE_TOOL_PEDIR_DATOS = "pedir_datos";

// Cuando la respuesta del bot es solo una pregunta con opciones, este es el texto que la representa.
export function textoDePedirDatos({ pregunta, opciones }: PedirDatos): string {
  return `${pregunta}\nOpciones: ${opciones.join(" / ")}`;
}
