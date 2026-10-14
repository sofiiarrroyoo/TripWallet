import { z } from "zod";
import { colapsarEspacios } from "@/lib/texto";
import { MONTO_MAXIMO, tieneHastaDosDecimales } from "@/lib/numeros";
import type { GastoRegistrado } from "@/tipos/gasto";
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

// Lo que devuelve registrar_gasto, tal como queda guardado en mensajes.llamadas_tools. La interfaz y el servidor lo leen
// con este esquema en vez de confiar en lo que haya guardado: una tarjeta vieja o mal formada no tiene que romper nada.
export const esquemaGastoRegistrado: z.ZodType<GastoRegistrado> = z.object({
  id: z.string(),
  descripcion: z.string(),
  categoria: z.string(),
  fechaGasto: z.string(),
  montoOriginal: z.number(),
  monedaOriginal: z.string(),
  montoConvertido: z.number(),
  monedaBase: z.string(),
  cotizacion: z.number(),
  fechaCotizacion: z.string(),
  fuente: z.string().nullable(),
  aviso: z.string().nullable(),
});

export const esquemaResultadoRegistro = z.object({ ok: z.literal(true), gasto: esquemaGastoRegistrado });

// De eliminar_gasto solo interesa saber qué gasto se borró.
export const esquemaResultadoEliminacion = z.object({ ok: z.literal(true), gasto: z.object({ id: z.string() }) });
