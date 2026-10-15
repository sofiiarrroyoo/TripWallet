import { z } from "zod";

// 1 = pulgar arriba, -1 = pulgar abajo (los mismos valores que acepta la restricción de la tabla).
export const esquemaCalificar = z.object({
  valor: z.union([z.literal(1), z.literal(-1)], "La calificación tiene que ser 1 (me sirvió) o -1 (no me sirvió)."),
});

export type ValorCalificacion = z.infer<typeof esquemaCalificar>["valor"];
