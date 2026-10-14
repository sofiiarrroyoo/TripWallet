import { z } from "zod";
import { colapsarEspacios } from "@/lib/texto";
import { MONTO_MAXIMO, tieneHastaDosDecimales } from "@/lib/numeros";
import { nombreCategoria } from "./categorias";
import { monedaIngresada } from "./cotizaciones";

const MAXIMO_CARACTERES_DESCRIPCION = 200;

// Lo que propone el bot (o cualquier otro cliente) para registrar un gasto. El código valida, convierte y calcula;
// el bot solo aporta los datos que extrajo del mensaje.
export const esquemaRegistrarGasto = z.object({
  monto: z
    .number("El monto tiene que ser un número.")
    .positive("El monto tiene que ser mayor a cero.")
    .max(MONTO_MAXIMO, "El monto es demasiado grande.")
    .refine(tieneHastaDosDecimales, "El monto puede tener hasta 2 decimales."),
  moneda: monedaIngresada("Indicá la moneda del gasto (código de 3 letras, ej. CLP)."),
  categoria: nombreCategoria,
  descripcion: z
    .string("Indicá una descripción del gasto.")
    .transform(colapsarEspacios)
    .pipe(
      z
        .string()
        .min(1, "Indicá una descripción del gasto.")
        .max(MAXIMO_CARACTERES_DESCRIPCION, `La descripción puede tener hasta ${MAXIMO_CARACTERES_DESCRIPCION} caracteres.`),
    ),
  // Si no se indica, el servicio usa la fecha de hoy en la zona horaria de la persona.
  fecha: z.iso.date("La fecha tiene que tener el formato AAAA-MM-DD.").optional(),
});

export type DatosRegistrarGasto = z.infer<typeof esquemaRegistrarGasto>;
