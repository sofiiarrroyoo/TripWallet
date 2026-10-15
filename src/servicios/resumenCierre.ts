import { Output, generateText } from "ai";
import { INSTRUCCIONES_RESUMEN, presentarEstadisticas, textoDeResumen } from "@/ia/resumenCierre";
import { AJUSTES_GENERACION, obtenerModelo } from "@/integraciones/modeloLLM";
import type { EstadisticasViaje } from "@/tipos/cierre";
import type { Viaje } from "@/tipos/viaje";
import { esquemaResumenCierre } from "@/validaciones/resumenCierre";

export const LIMITE_RESUMEN_MS = 20_000;
const MAXIMO_TOKENS_RESUMEN = 800;

// Le pide al modelo un resumen breve del viaje, con salida estructurada (titular y puntos, validados con Zod). El modelo
// solo redacta: los números ya vienen calculados. Si falla o tarda más que el límite devuelve null: el viaje se cierra
// igual, sin resumen, en vez de quedar trabado por un problema del proveedor.
export async function generarResumen(
  viaje: Viaje,
  estadisticas: EstadisticasViaje,
  limiteMs = LIMITE_RESUMEN_MS,
): Promise<string | null> {
  try {
    const { output } = await generateText({
      model: obtenerModelo(),
      instructions: INSTRUCCIONES_RESUMEN,
      prompt: JSON.stringify(presentarEstadisticas(viaje, estadisticas)),
      output: Output.object({ schema: esquemaResumenCierre }),
      ...AJUSTES_GENERACION,
      maxOutputTokens: MAXIMO_TOKENS_RESUMEN,
      timeout: { totalMs: limiteMs },
    });
    return textoDeResumen(output);
  } catch (error) {
    console.warn("No se pudo generar el resumen del viaje: se cierra sin resumen", error);
    return null;
  }
}
