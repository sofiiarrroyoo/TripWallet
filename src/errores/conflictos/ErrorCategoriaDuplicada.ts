import { ErrorConflicto } from "./ErrorConflicto";

export class ErrorCategoriaDuplicada extends ErrorConflicto {
  constructor(readonly nombre: string) {
    super("CATEGORIA_DUPLICADA", `Ya existe una categoría llamada "${nombre}".`);
  }
}
