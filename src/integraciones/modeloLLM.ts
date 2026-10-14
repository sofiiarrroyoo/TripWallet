import { openai } from "@ai-sdk/openai";

// Fijado a una versión con fecha: el alias "gpt-5.4-mini" puede cambiar de comportamiento sin avisar.
const MODELO_POR_DEFECTO = "gpt-5.4-mini-2026-03-17";

export function obtenerNombreModelo(): string {
  return process.env.OPENAI_MODELO?.trim() || MODELO_POR_DEFECTO;
}

// La key la toma el SDK de la variable de entorno OPENAI_API_KEY; nunca pasa por nuestro código.
export function obtenerModelo() {
  return openai(obtenerNombreModelo());
}

export const AJUSTES_GENERACION = {
  // Los modelos de razonamiento "piensan" antes de escribir: con esfuerzo bajo empieza a contestar más rápido.
  reasoning: "low",
  // Incluye los tokens de razonamiento. Acota lo que puede costar una respuesta.
  maxOutputTokens: 1500,
  timeout: { totalMs: 60_000 },
  providerOptions: {
    // No pedir resúmenes del razonamiento (no se muestran) ni que OpenAI guarde la conversación.
    openai: { reasoningSummary: null, store: false },
  },
} as const;
