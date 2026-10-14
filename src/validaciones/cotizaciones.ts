import { z } from "zod";
import { MONTO_MAXIMO } from "@/lib/numeros";

const codigoMoneda = z.string().regex(/^[A-Z]{3}$/);

// Unidades de cada moneda por una unidad de la moneda base de la cotización.
export const esquemaTasas = z.record(codigoMoneda, z.number().positive());

const monedaIngresada = (mensaje: string) =>
  z
    .string(mensaje)
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, mensaje);

export const esquemaConversion = z.object({
  monto: z
    .number("El monto tiene que ser un número.")
    .positive("El monto tiene que ser mayor a cero.")
    .max(MONTO_MAXIMO, "El monto es demasiado grande."),
  monedaOriginal: monedaIngresada("Indicá la moneda del monto (código de 3 letras, ej. CLP)."),
  monedaBase: monedaIngresada("Indicá la moneda a la que convertir (código de 3 letras, ej. ARS)."),
});

export type DatosConversion = z.infer<typeof esquemaConversion>;
