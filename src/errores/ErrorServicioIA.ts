import { ErrorApp } from "./ErrorApp";

export class ErrorServicioIA extends ErrorApp {
  constructor(opciones?: ErrorOptions) {
    super(
      "IA_NO_DISPONIBLE",
      "El asistente no está disponible en este momento. Probá de nuevo en unos minutos.",
      opciones,
    );
  }
}
