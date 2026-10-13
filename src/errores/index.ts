// Los errores no conocen HTTP: la traducción a status vive en la capa de la API (app/api/_utilidades).

export abstract class ErrorApp extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
    opciones?: ErrorOptions,
  ) {
    super(mensaje, opciones);
    this.name = new.target.name;
  }
}

export type DetalleValidacion = { campo: string; mensaje: string };

export class ErrorValidacion extends ErrorApp {
  constructor(
    mensaje = "Los datos enviados no son válidos.",
    readonly detalles: DetalleValidacion[] = [],
  ) {
    super("VALIDACION", mensaje);
  }
}

export class ErrorNoAutenticado extends ErrorApp {
  constructor() {
    super("NO_AUTENTICADO", "Tu sesión no es válida o expiró. Volvé a iniciar sesión.");
  }
}

const recursosNoEncontrados = {
  VIAJE: "No encontramos ese viaje.",
  GASTO: "No encontramos ese gasto.",
  MENSAJE: "No encontramos ese mensaje.",
  CATEGORIA: "No encontramos esa categoría.",
} as const;

export type RecursoNoEncontrado = keyof typeof recursosNoEncontrados;

// También se usa cuando el recurso es de otro usuario: responder "no existe" no confirma que exista.
export class ErrorNoEncontrado extends ErrorApp {
  constructor(readonly recurso: RecursoNoEncontrado) {
    super(`${recurso}_NO_ENCONTRADO`, recursosNoEncontrados[recurso]);
  }
}

// Clase intermedia: el pedido es válido pero choca con el estado actual. Todos se traducen igual (409).
export abstract class ErrorConflicto extends ErrorApp {}

export class ErrorViajeCerrado extends ErrorConflicto {
  constructor() {
    super("VIAJE_CERRADO", "El viaje está cerrado. Reabrilo si necesitás registrar o borrar gastos.");
  }
}

export class ErrorViajeAbierto extends ErrorConflicto {
  constructor() {
    super("VIAJE_ABIERTO", "Este viaje ya estaba abierto.");
  }
}

export class ErrorViajeSinGastos extends ErrorConflicto {
  constructor() {
    super(
      "VIAJE_SIN_GASTOS",
      "Este viaje no tiene gastos registrados, así que no hay nada para resumir. Registrá al menos un gasto antes de cerrarlo.",
    );
  }
}

export class ErrorGastosModificados extends ErrorConflicto {
  constructor() {
    super(
      "GASTOS_MODIFICADOS",
      "Se están registrando gastos en este viaje mientras intentás cerrarlo. Esperá un momento y volvé a intentar.",
    );
  }
}

export class ErrorCategoriaDuplicada extends ErrorConflicto {
  constructor(readonly nombre: string) {
    super("CATEGORIA_DUPLICADA", `Ya existe una categoría llamada "${nombre}".`);
  }
}

export class ErrorLimiteExcedido extends ErrorApp {
  constructor(readonly segundosParaReintentar: number) {
    super(
      "LIMITE_EXCEDIDO",
      "Llegaste al límite de mensajes por hora. Esperá un rato antes de seguir.",
    );
  }
}

export class ErrorCotizacionNoDisponible extends ErrorApp {
  constructor(opciones?: ErrorOptions) {
    super(
      "COTIZACION_NO_DISPONIBLE",
      "No pudimos obtener las cotizaciones y no hay ninguna guardada. Probá de nuevo en unos minutos.",
      opciones,
    );
  }
}

export class ErrorServicioIA extends ErrorApp {
  constructor(opciones?: ErrorOptions) {
    super(
      "IA_NO_DISPONIBLE",
      "El asistente no está disponible en este momento. Probá de nuevo en unos minutos.",
      opciones,
    );
  }
}
