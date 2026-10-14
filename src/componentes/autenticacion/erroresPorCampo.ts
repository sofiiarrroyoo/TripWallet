import type { DetalleValidacion } from "@/errores";

export const CAMPOS = ["email", "contrasena"] as const;
export type Campo = (typeof CAMPOS)[number];
export type ErroresCampos = Partial<Record<Campo, string>>;

function esCampo(campo: string): campo is Campo {
  return (CAMPOS as readonly string[]).includes(campo);
}

// Un mensaje por campo (el primero, que es el más básico: "Ingresá tu email" antes que "email inválido").
// Los detalles de campos que el formulario no tiene se devuelven aparte para mostrarlos como error general.
export function erroresPorCampo(detalles: DetalleValidacion[]): {
  campos: ErroresCampos;
  otros: string[];
} {
  const campos: ErroresCampos = {};
  const otros: string[] = [];
  for (const { campo, mensaje } of detalles) {
    if (!esCampo(campo)) otros.push(mensaje);
    else campos[campo] ??= mensaje;
  }
  return { campos, otros };
}
