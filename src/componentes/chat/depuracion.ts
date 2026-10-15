import type { UIMessage } from "ai";
import { esquemaMetadataMensaje } from "@/validaciones/metadataMensaje";

// Lo que muestra el panel de debug de una respuesta del bot: qué tools llamó (con qué parámetros y qué devolvieron),
// qué modelo la generó y cuántos tokens consumió.

export type EstadoLlamada = "completada" | "con error" | "en curso";

export type LlamadaDepurada = {
  id: string;
  nombre: string;
  estado: EstadoLlamada;
  argumentos: unknown;
  // Lo que devolvió la tool; si falló la ejecución, el texto del error.
  resultado: unknown;
};

export type Depuracion = {
  llamadas: LlamadaDepurada[];
  modelo: string | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
  tokensTotales: number | null;
};

const PREFIJO_TOOL = "tool-";

function propiedad(parte: unknown, nombre: string): unknown {
  return typeof parte === "object" && parte !== null ? (parte as Record<string, unknown>)[nombre] : undefined;
}

function estadoDe(parte: unknown): EstadoLlamada {
  const estado = propiedad(parte, "state");
  if (estado === "output-available") return "completada";
  if (estado === "output-error") return "con error";
  return "en curso";
}

function llamadaDe(parte: unknown, indice: number): LlamadaDepurada {
  const tipo = String(propiedad(parte, "type"));
  const estado = estadoDe(parte);
  return {
    id: String(propiedad(parte, "toolCallId") ?? indice),
    nombre: tipo.slice(PREFIJO_TOOL.length),
    estado,
    argumentos: propiedad(parte, "input"),
    resultado: estado === "con error" ? propiedad(parte, "errorText") : propiedad(parte, "output"),
  };
}

export function depuracionDe(mensaje: UIMessage): Depuracion {
  const llamadas = mensaje.parts
    .filter((parte) => parte.type.startsWith(PREFIJO_TOOL))
    .map((parte, indice) => llamadaDe(parte, indice));

  const metadata = esquemaMetadataMensaje.safeParse(mensaje.metadata);
  const { modelo = null, tokensEntrada = null, tokensSalida = null } = metadata.success ? metadata.data : {};
  const tokensTotales =
    tokensEntrada === null || tokensEntrada === undefined || tokensSalida === null || tokensSalida === undefined
      ? null
      : tokensEntrada + tokensSalida;

  return {
    llamadas,
    modelo: modelo ?? null,
    tokensEntrada: tokensEntrada ?? null,
    tokensSalida: tokensSalida ?? null,
    tokensTotales,
  };
}

// Un valor de una tool, indentado para leerlo en el panel.
export function textoJson(valor: unknown): string {
  if (valor === undefined) return "—";
  return typeof valor === "string" ? valor : JSON.stringify(valor, null, 2);
}
