import type { DetalleValidacion } from "@/errores";

// Un mensaje por campo (el primero, que es el más básico: "Ingresá tu email" antes que "email inválido").
// Los detalles de campos que el formulario no tiene se devuelven aparte para mostrarlos como error general.
export function erroresPorCampo<Campo extends string>(
  detalles: DetalleValidacion[],
  camposDelFormulario: readonly Campo[],
): { campos: Partial<Record<Campo, string>>; otros: string[] } {
  const campos: Partial<Record<Campo, string>> = {};
  const otros: string[] = [];
  for (const { campo, mensaje } of detalles) {
    const campoConocido = camposDelFormulario.find((nombre) => nombre === campo);
    if (campoConocido === undefined) otros.push(mensaje);
    else campos[campoConocido] ??= mensaje;
  }
  return { campos, otros };
}
