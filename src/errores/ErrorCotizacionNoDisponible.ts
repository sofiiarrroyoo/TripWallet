import { ErrorApp } from "./ErrorApp";

export class ErrorCotizacionNoDisponible extends ErrorApp {
  constructor(opciones?: ErrorOptions) {
    super(
      "COTIZACION_NO_DISPONIBLE",
      "No pudimos obtener las cotizaciones y no hay ninguna guardada. Probá de nuevo en unos minutos.",
      opciones,
    );
  }
}
