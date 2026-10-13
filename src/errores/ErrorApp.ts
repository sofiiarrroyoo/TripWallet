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
