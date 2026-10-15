export type PartesResumen = { titular: string; puntos: string[] };

// El resumen se guarda como texto: el titular, una línea en blanco y los puntos, uno por línea, con un guion adelante.
// Acá se vuelve a separar para mostrarlo con su formato. Si el texto no tiene ese formato, todo queda como titular.
export function partesDeResumen(texto: string): PartesResumen {
  const lineas = texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
  const puntos = lineas.filter((linea) => linea.startsWith("- ")).map((linea) => linea.slice(2).trim());
  const titular = lineas.filter((linea) => !linea.startsWith("- ")).join(" ");
  return { titular, puntos };
}
