import { type UIMessage, getToolName, isToolUIPart } from "ai";
import { textoDe } from "./mensajesUI";

export const ETIQUETA_ESCRIBIENDO = "Escribiendo…";

const ETIQUETAS_TOOLS: Record<string, string> = {
  convertir_moneda: "Consultando cotización…",
  registrar_gasto: "Registrando el gasto…",
  consultar_gastos: "Consultando tus gastos…",
  eliminar_gasto: "Eliminando el gasto…",
  crear_categoria: "Creando la categoría…",
  estimar_presupuesto: "Estimando el presupuesto…",
  cerrar_viaje: "Cerrando el viaje…",
  pedir_datos: "Preparando una pregunta…",
};

const ETIQUETA_TOOL_DESCONOCIDA = "Trabajando en tu pedido…";

const ESTADOS_EN_CURSO = new Set(["input-streaming", "input-available"]);

export function etiquetaTool(nombre: string): string {
  return ETIQUETAS_TOOLS[nombre] ?? ETIQUETA_TOOL_DESCONOCIDA;
}

// Qué muestra el asistente mientras trabaja: la etiqueta de la tool que está corriendo o, si todavía no escribió
// nada, "Escribiendo…". null cuando ya está llegando el texto de la respuesta (o no hay nada en curso).
export function actividadDelAsistente(
  estado: "submitted" | "streaming" | "ready" | "error",
  ultimoMensaje: UIMessage | undefined,
): string | null {
  if (estado === "submitted") return ETIQUETA_ESCRIBIENDO;
  if (estado !== "streaming" || ultimoMensaje?.role !== "assistant") return null;

  const toolEnCurso = ultimoMensaje.parts.find((parte) => isToolUIPart(parte) && ESTADOS_EN_CURSO.has(parte.state));
  if (toolEnCurso && isToolUIPart(toolEnCurso)) return etiquetaTool(getToolName(toolEnCurso));

  return textoDe(ultimoMensaje) === "" ? ETIQUETA_ESCRIBIENDO : null;
}
