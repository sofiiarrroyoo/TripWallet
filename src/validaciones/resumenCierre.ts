import { z } from "zod";

// Lo que tiene que devolver el modelo al armar el resumen de un viaje cerrado. El SDK valida la salida del modelo con
// este esquema: si no lo cumple, no se usa.
export const esquemaResumenCierre = z.object({
  titular: z.string().trim().min(1).max(160).describe("Una frase con lo más importante del viaje."),
  puntos: z
    .array(z.string().trim().min(1).max(260))
    .min(2)
    .max(4)
    .describe("Entre 2 y 4 puntos cortos, cada uno con un dato concreto del viaje."),
});

export type ResumenCierre = z.infer<typeof esquemaResumenCierre>;
