// Para comparar y buscar: "Dólar" y "dolar " dan lo mismo.
export function normalizarParaBuscar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

// Recorta y colapsa los espacios repetidos (también tabulaciones y saltos de línea) en uno solo.
export function colapsarEspacios(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}
