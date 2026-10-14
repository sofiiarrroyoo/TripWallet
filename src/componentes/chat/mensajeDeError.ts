import { ERROR_RED, leerErrorApi } from "@/lib/llamarApi";

const MENSAJE_GENERICO = "El asistente no pudo responder. Probá de nuevo.";

// useChat entrega el cuerpo de la respuesta de error como message: si es nuestro formato, se muestra tal cual
// (ej. el límite por hora); si no, un mensaje genérico para no exponer detalles del servidor.
export function mensajeDeError(error: unknown): string {
  if (error instanceof TypeError) return ERROR_RED.mensaje;
  const errorApi = error instanceof Error ? leerErrorApi(error.message) : null;
  return errorApi?.mensaje ?? MENSAJE_GENERICO;
}
