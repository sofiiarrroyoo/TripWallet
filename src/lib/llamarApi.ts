import { z } from "zod";

const esquemaCuerpoError = z.object({
  error: z.object({
    codigo: z.string(),
    mensaje: z.string(),
    detalles: z.array(z.object({ campo: z.string(), mensaje: z.string() })).optional(),
  }),
});

export type ErrorApi = z.infer<typeof esquemaCuerpoError>["error"];
export type ResultadoApi<T> = { ok: true; datos: T } | { ok: false; error: ErrorApi };

type OpcionesLlamada = {
  metodo?: "GET" | "POST" | "PATCH" | "DELETE";
  cuerpo?: unknown;
};

// Para las respuestas cuyo cuerpo no se usa (un 204, o un login que solo necesita saber si salió bien).
export const sinDatos = z.unknown().transform(() => null);

const ERROR_RED: ErrorApi = {
  codigo: "ERROR_RED",
  mensaje: "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.",
};

const ERROR_INESPERADO: ErrorApi = {
  codigo: "ERROR_INTERNO",
  mensaje: "Ocurrió un error inesperado. Probá de nuevo en unos minutos.",
};

async function leerJson(respuesta: Response): Promise<unknown> {
  try {
    return await respuesta.json();
  } catch {
    return undefined;
  }
}

// Devuelve un resultado en vez de lanzar: los componentes deciden qué mostrar con un if, sin try/catch.
export async function llamarApi<T>(
  ruta: string,
  esquemaRespuesta: z.ZodType<T>,
  { metodo = "GET", cuerpo }: OpcionesLlamada = {},
): Promise<ResultadoApi<T>> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { "content-type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    return { ok: false, error: ERROR_RED };
  }

  const json = await leerJson(respuesta);

  if (!respuesta.ok) {
    // Un error que no viene con nuestro formato (ej. una página de error de Vercel) se muestra genérico.
    const cuerpoError = esquemaCuerpoError.safeParse(json);
    return { ok: false, error: cuerpoError.success ? cuerpoError.data.error : ERROR_INESPERADO };
  }

  const datos = esquemaRespuesta.safeParse(json);
  if (!datos.success) {
    console.error(`Respuesta inesperada de ${ruta}:`, datos.error);
    return { ok: false, error: ERROR_INESPERADO };
  }
  return { ok: true, datos: datos.data };
}
