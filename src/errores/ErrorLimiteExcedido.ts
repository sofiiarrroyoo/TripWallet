import { ErrorApp } from "./ErrorApp";

export class ErrorLimiteExcedido extends ErrorApp {
  constructor(readonly segundosParaReintentar: number) {
    super(
      "LIMITE_EXCEDIDO",
      "Llegaste al límite de mensajes por hora. Esperá un rato antes de seguir.",
    );
  }
}
