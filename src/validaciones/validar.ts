import type { z } from "zod";
import { ErrorValidacion } from "@/errores";

export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    const detalles = resultado.error.issues.map((issue) => ({
      campo: issue.path.join("."),
      mensaje: issue.message,
    }));
    throw new ErrorValidacion(undefined, detalles);
  }
  return resultado.data;
}
