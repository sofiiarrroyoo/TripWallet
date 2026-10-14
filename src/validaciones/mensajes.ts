import { z } from "zod";
import type { Json } from "@/tipos/supabase";

// Cada elemento de mensajes.llamadas_tools: qué tool corrió, con qué argumentos y qué devolvió.
export const esquemaLlamadasTools = z.array(
  z.object({
    nombre: z.string().min(1),
    argumentos: z.json(),
    resultado: z.json(),
  }),
);

export type LlamadaTool = { nombre: string; argumentos: Json; resultado: Json };
