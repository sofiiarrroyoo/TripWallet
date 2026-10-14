import { ErrorApp } from "./ErrorApp";

export class ErrorLimiteExcedido extends ErrorApp {
  constructor(
    readonly segundosParaReintentar: number,
    mensaje = "Llegaste al límite de mensajes por hora. Esperá un rato antes de seguir.",
  ) {
    super("LIMITE_EXCEDIDO", mensaje);
  }
}
