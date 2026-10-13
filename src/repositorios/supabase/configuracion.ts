import { z } from "zod";

const esquemaEntorno = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type ConfiguracionSupabase = { url: string; clavePublica: string };

// Se valida al usarla y no al importar el módulo, para que el build no dependa de las variables de entorno.
export function obtenerConfiguracionSupabase(): ConfiguracionSupabase {
  const resultado = esquemaEntorno.safeParse(process.env);
  if (!resultado.success) {
    const variables = resultado.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Variables de entorno de Supabase faltantes o inválidas: ${variables}`);
  }
  return {
    url: resultado.data.NEXT_PUBLIC_SUPABASE_URL,
    clavePublica: resultado.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
