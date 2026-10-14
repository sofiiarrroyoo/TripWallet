import type { z } from "zod";
import { type DetalleValidacion, ErrorValidacion } from "@/errores";

export function detallesDeValidacion(error: z.ZodError): DetalleValidacion[] {
  return error.issues.map((issue) => ({
    campo: issue.path.join("."),
    mensaje: issue.message,
  }));
}

export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    throw new ErrorValidacion(undefined, detallesDeValidacion(resultado.error));
  }
  return resultado.data;
}
