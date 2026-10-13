import { ErrorConflicto } from "./ErrorConflicto";

export class ErrorViajeSinGastos extends ErrorConflicto {
  constructor() {
    super(
      "VIAJE_SIN_GASTOS",
      "Este viaje no tiene gastos registrados, así que no hay nada para resumir. Registrá al menos un gasto antes de cerrarlo.",
    );
  }
}
