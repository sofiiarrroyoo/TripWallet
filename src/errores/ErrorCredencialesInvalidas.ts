import { ErrorApp } from "./ErrorApp";

// Mensaje genérico a propósito: no dice si falló el email o la contraseña, para no confirmar qué cuentas existen.
export class ErrorCredencialesInvalidas extends ErrorApp {
  constructor() {
    super("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  }
}
