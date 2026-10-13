import { ErrorApp } from "./ErrorApp";

export type DetalleValidacion = { campo: string; mensaje: string };

export class ErrorValidacion extends ErrorApp {
  constructor(
    mensaje = "Los datos enviados no son válidos.",
    readonly detalles: DetalleValidacion[] = [],
  ) {
    super("VALIDACION", mensaje);
  }
}
