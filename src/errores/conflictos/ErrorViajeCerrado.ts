import { ErrorConflicto } from "./ErrorConflicto";

export class ErrorViajeCerrado extends ErrorConflicto {
  constructor() {
    super("VIAJE_CERRADO", "El viaje está cerrado. Reabrilo si necesitás registrar o borrar gastos.");
  }
}
