// numeric(14, 2) en la base: hasta 12 dígitos enteros y 2 decimales.
export const MONTO_MAXIMO = 999_999_999_999.99;

// Number.EPSILON evita que 1.005 se redondee a 1.00 por el error de representación de los decimales en binario.
export function redondearADosDecimales(numero: number): number {
  return Math.round((numero + Number.EPSILON) * 100) / 100;
}

// numeric(20, 10) en la base: la cotización se guarda con 10 decimales.
export function redondearADiezDecimales(numero: number): number {
  return Number(numero.toFixed(10));
}
