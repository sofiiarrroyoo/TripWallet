import { ErrorConflicto } from "./ErrorConflicto";

export class ErrorEmailYaRegistrado extends ErrorConflicto {
  constructor() {
    super("EMAIL_YA_REGISTRADO", "Ya existe una cuenta con ese email. ¿Querés iniciar sesión?");
  }
}
