import { normalizarParaBuscar as normalizar } from "@/lib/texto";
import type { Moneda } from "@/tipos/moneda";

export function textoDeMoneda(moneda: Moneda): string {
  return `${moneda.codigo} · ${moneda.nombre}`;
}

// Menor es mejor; null = no coincide.
function relevancia(moneda: Moneda, busqueda: string): number | null {
  const codigo = moneda.codigo.toLowerCase();
  const nombre = normalizar(moneda.nombre);
  if (codigo === busqueda) return 0;
  if (codigo.startsWith(busqueda)) return 1;
  if (nombre.startsWith(busqueda) || nombre.includes(` ${busqueda}`)) return 2;
  if (nombre.includes(busqueda)) return 3;
  return null;
}

// Mantiene el orden de entrada (alfabético) entre monedas igual de relevantes.
export function filtrarMonedas(monedas: Moneda[], texto: string): Moneda[] {
  const busqueda = normalizar(texto);
  if (!busqueda) return monedas;

  return monedas
    .map((moneda) => ({ moneda, puntaje: relevancia(moneda, busqueda) }))
    .filter((candidata): candidata is { moneda: Moneda; puntaje: number } => candidata.puntaje !== null)
    .sort((a, b) => a.puntaje - b.puntaje)
    .map(({ moneda }) => moneda);
}
