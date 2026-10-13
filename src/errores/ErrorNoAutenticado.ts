import { ErrorApp } from "./ErrorApp";

export class ErrorNoAutenticado extends ErrorApp {
  constructor() {
    super("NO_AUTENTICADO", "Tu sesión no es válida o expiró. Volvé a iniciar sesión.");
  }
}
