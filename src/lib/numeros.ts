// numeric(14, 2) en la base: hasta 12 dígitos enteros y 2 decimales.
export const MONTO_MAXIMO = 999_999_999_999.99;

export function tieneHastaDosDecimales(numero: number): boolean {
  return /^\d+(\.\d{1,2})?$/.test(String(numero));
}

// Number.EPSILON evita que 1.005 se redondee a 1.00 por el error de representación de los decimales en binario.
export function redondearADosDecimales(numero: number): number {
  return Math.round((numero + Number.EPSILON) * 100) / 100;
}

// Para porcentajes: 33,333...% se muestra como 33,3%.
export function redondearAUnDecimal(numero: number): number {
  return Math.round((numero + Number.EPSILON) * 10) / 10;
}

// numeric(20, 10) en la base: la cotización se guarda con 10 decimales.
export function redondearADiezDecimales(numero: number): number {
  return Number(numero.toFixed(10));
}

// Suma montos con 2 decimales sin arrastrar el error de los decimales en binario (0,1 + 0,2 daría 0,30000000000000004):
// se suma en centavos enteros y se divide al final.
export function sumarMontos(montos: number[]): number {
  const centavos = montos.reduce((acumulado, monto) => acumulado + Math.round(monto * 100), 0);
  return centavos / 100;
}
