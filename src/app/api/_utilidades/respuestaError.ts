import {
  type DetalleValidacion,
  ErrorApp,
  ErrorConflicto,
  ErrorCotizacionNoDisponible,
  ErrorLimiteExcedido,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorServicioIA,
  ErrorValidacion,
} from "@/errores";

type CuerpoError = {
  error: { codigo: string; mensaje: string; detalles?: DetalleValidacion[] };
};

const MENSAJE_GENERICO = "Ocurrió un error inesperado. Probá de nuevo en unos minutos.";

function statusHttp(error: ErrorApp): number | null {
  if (error instanceof ErrorValidacion) return 400;
  if (error instanceof ErrorNoAutenticado) return 401;
  if (error instanceof ErrorNoEncontrado) return 404;
  if (error instanceof ErrorConflicto) return 409;
  if (error instanceof ErrorLimiteExcedido) return 429;
  if (error instanceof ErrorCotizacionNoDisponible) return 503;
  if (error instanceof ErrorServicioIA) return 503;
  return null;
}

function errorInterno(error: unknown): Response {
  console.error("Error inesperado:", error);
  const cuerpo: CuerpoError = { error: { codigo: "ERROR_INTERNO", mensaje: MENSAJE_GENERICO } };
  return Response.json(cuerpo, { status: 500 });
}

export function respuestaError(error: unknown): Response {
  if (!(error instanceof ErrorApp)) return errorInterno(error);

  const status = statusHttp(error);
  // Un ErrorApp sin status asignado es un olvido nuestro: se trata como inesperado para que quede en el log.
  if (status === null) return errorInterno(error);

  const cuerpo: CuerpoError = { error: { codigo: error.codigo, mensaje: error.message } };
  if (error instanceof ErrorValidacion && error.detalles.length > 0) {
    cuerpo.error.detalles = error.detalles;
  }

  const headers = new Headers();
  if (error instanceof ErrorLimiteExcedido) {
    headers.set("Retry-After", String(Math.ceil(error.segundosParaReintentar)));
  }

  return Response.json(cuerpo, { status, headers });
}
