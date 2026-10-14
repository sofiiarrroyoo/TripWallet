import { ErrorConflicto } from "./ErrorConflicto";

// El reintento solo tiene sentido si el último mensaje del chat es del usuario y quedó sin respuesta.
export class ErrorSinMensajePendiente extends ErrorConflicto {
  constructor() {
    super("SIN_MENSAJE_PENDIENTE", "No hay ningún mensaje esperando respuesta. Escribí uno nuevo.");
  }
}
