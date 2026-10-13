import { ErrorConflicto } from "./ErrorConflicto";

export class ErrorGastosModificados extends ErrorConflicto {
  constructor() {
    super(
      "GASTOS_MODIFICADOS",
      "Se están registrando gastos en este viaje mientras intentás cerrarlo. Esperá un momento y volvé a intentar.",
    );
  }
}
