import { ErrorApp } from "./ErrorApp";

const mensajesPorRecurso = {
  VIAJE: "No encontramos ese viaje.",
  GASTO: "No encontramos ese gasto.",
  MENSAJE: "No encontramos ese mensaje.",
  CATEGORIA: "No encontramos esa categoría.",
} as const;

export type RecursoNoEncontrado = keyof typeof mensajesPorRecurso;

// También se usa cuando el recurso es de otro usuario: responder "no existe" no confirma que exista.
export class ErrorNoEncontrado extends ErrorApp {
  constructor(readonly recurso: RecursoNoEncontrado) {
    super(`${recurso}_NO_ENCONTRADO`, mensajesPorRecurso[recurso]);
  }
}
