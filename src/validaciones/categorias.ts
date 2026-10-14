import { z } from "zod";
import { colapsarEspacios } from "@/lib/texto";

const MAXIMO_CARACTERES_NOMBRE = 50;

// El nombre se normaliza antes de validar porque la base exige que no tenga espacios al inicio, al final ni repetidos.
export const nombreCategoria = z
  .string("Indicá el nombre de la categoría.")
  .transform(colapsarEspacios)
  .pipe(
    z
      .string()
      .min(1, "Indicá el nombre de la categoría.")
      .max(MAXIMO_CARACTERES_NOMBRE, `El nombre puede tener hasta ${MAXIMO_CARACTERES_NOMBRE} caracteres.`),
  );

export const esquemaCrearCategoria = z.object({ nombre: nombreCategoria });
