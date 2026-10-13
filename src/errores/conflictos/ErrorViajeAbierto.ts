import { ErrorConflicto } from "./ErrorConflicto";

export class ErrorViajeAbierto extends ErrorConflicto {
  constructor() {
    super("VIAJE_ABIERTO", "Este viaje ya estaba abierto.");
  }
}
