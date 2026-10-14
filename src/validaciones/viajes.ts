import { z } from "zod";
import { MONTO_MAXIMO, tieneHastaDosDecimales } from "@/lib/numeros";

function textoObligatorio(mensajeVacio: string, nombreCampo: string) {
  return z
    .string(mensajeVacio)
    .trim()
    .min(1, mensajeVacio)
    .max(100, `${nombreCampo} puede tener hasta 100 caracteres.`);
}

export const esquemaCrearViaje = z
  .object({
    nombre: textoObligatorio("Ingresá un nombre para el viaje.", "El nombre"),
    destino: textoObligatorio("Ingresá el destino.", "El destino"),
    monedaBase: z
      .string("Elegí la moneda base.")
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Elegí la moneda base."),
    fechaInicio: z.iso.date("Ingresá la fecha de inicio."),
    fechaFin: z.iso.date("Ingresá la fecha de fin."),
    presupuestoTotal: z
      .number("El presupuesto tiene que ser un número.")
      .positive("El presupuesto tiene que ser mayor a cero.")
      .max(MONTO_MAXIMO, "El presupuesto es demasiado grande.")
      .refine(tieneHastaDosDecimales, "El presupuesto puede tener hasta 2 decimales.")
      .nullish()
      .transform((presupuesto) => presupuesto ?? null),
  })
  // Las fechas ISO (AAAA-MM-DD) se pueden comparar como texto.
  .refine((viaje) => viaje.fechaFin >= viaje.fechaInicio, {
    path: ["fechaFin"],
    message: "La fecha de fin no puede ser anterior a la de inicio.",
  });

export type DatosCrearViaje = z.infer<typeof esquemaCrearViaje>;
