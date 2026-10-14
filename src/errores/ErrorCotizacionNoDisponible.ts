import { ErrorApp } from "./ErrorApp";

export class ErrorCotizacionNoDisponible extends ErrorApp {
  constructor(
    mensaje = "No pudimos obtener las cotizaciones y no hay ninguna guardada. Probá de nuevo en unos minutos.",
    opciones?: ErrorOptions,
  ) {
    super("COTIZACION_NO_DISPONIBLE", mensaje, opciones);
  }
}
