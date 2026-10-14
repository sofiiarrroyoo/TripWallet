// Acepta "1500", "1500,5" o "1500.50". Sin separador de miles: "1.500" es ambiguo (¿mil quinientos o uno con
// cinco?), así que se rechaza en lugar de adivinar.
const FORMATO_MONTO = /^\d+([.,]\d{1,2})?$/;

export type MontoLeido = { tipo: "vacio" } | { tipo: "invalido" } | { tipo: "valido"; monto: number };

export function leerMonto(texto: string): MontoLeido {
  const limpio = texto.trim();
  if (!limpio) return { tipo: "vacio" };
  if (!FORMATO_MONTO.test(limpio)) return { tipo: "invalido" };
  return { tipo: "valido", monto: Number(limpio.replace(",", ".")) };
}
