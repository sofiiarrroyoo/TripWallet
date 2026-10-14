import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ErrorApp,
  ErrorCategoriaDuplicada,
  ErrorCotizacionNoDisponible,
  ErrorCredencialesInvalidas,
  ErrorEmailYaRegistrado,
  ErrorGastosModificados,
  ErrorLimiteExcedido,
  ErrorNoAutenticado,
  ErrorNoEncontrado,
  ErrorServicioIA,
  ErrorSinMensajePendiente,
  ErrorValidacion,
  ErrorViajeAbierto,
  ErrorViajeCerrado,
  ErrorViajeSinGastos,
} from "@/errores";
import { respuestaError } from "./respuestaError";

describe("respuestaError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [new ErrorValidacion(), 400, "VALIDACION"],
    [new ErrorNoAutenticado(), 401, "NO_AUTENTICADO"],
    [new ErrorCredencialesInvalidas(), 401, "CREDENCIALES_INVALIDAS"],
    [new ErrorNoEncontrado("VIAJE"), 404, "VIAJE_NO_ENCONTRADO"],
    [new ErrorNoEncontrado("GASTO"), 404, "GASTO_NO_ENCONTRADO"],
    [new ErrorViajeCerrado(), 409, "VIAJE_CERRADO"],
    [new ErrorViajeAbierto(), 409, "VIAJE_ABIERTO"],
    [new ErrorViajeSinGastos(), 409, "VIAJE_SIN_GASTOS"],
    [new ErrorGastosModificados(), 409, "GASTOS_MODIFICADOS"],
    [new ErrorCategoriaDuplicada("Otros"), 409, "CATEGORIA_DUPLICADA"],
    [new ErrorEmailYaRegistrado(), 409, "EMAIL_YA_REGISTRADO"],
    [new ErrorSinMensajePendiente(), 409, "SIN_MENSAJE_PENDIENTE"],
    [new ErrorLimiteExcedido(120), 429, "LIMITE_EXCEDIDO"],
    [new ErrorCotizacionNoDisponible(), 503, "COTIZACION_NO_DISPONIBLE"],
    [new ErrorServicioIA(), 503, "IA_NO_DISPONIBLE"],
  ])("traduce %o a %i con código %s", async (error, status, codigo) => {
    const respuesta = respuestaError(error);

    expect(respuesta.status).toBe(status);
    expect(await respuesta.json()).toEqual({
      error: { codigo, mensaje: error.message },
    });
  });

  it("incluye los detalles de validación cuando los hay", async () => {
    const detalles = [{ campo: "monto", mensaje: "Tiene que ser mayor a cero" }];

    const respuesta = respuestaError(new ErrorValidacion("Datos inválidos", detalles));

    expect(await respuesta.json()).toEqual({
      error: { codigo: "VALIDACION", mensaje: "Datos inválidos", detalles },
    });
  });

  it("agrega Retry-After redondeado hacia arriba cuando se excede el límite", () => {
    const respuesta = respuestaError(new ErrorLimiteExcedido(90.2));

    expect(respuesta.headers.get("Retry-After")).toBe("91");
  });

  it("responde 500 genérico ante un error inesperado, sin filtrar el detalle", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("connection refused at 10.0.0.1:5432");

    const respuesta = respuestaError(error);
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(500);
    expect(cuerpo.error.codigo).toBe("ERROR_INTERNO");
    expect(JSON.stringify(cuerpo)).not.toContain("10.0.0.1");
    expect(log).toHaveBeenCalledWith("Error inesperado:", error);
  });

  it("trata como inesperado un ErrorApp sin status asignado", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    class ErrorNuevoSinMapear extends ErrorApp {
      constructor() {
        super("NUEVO", "detalle interno");
      }
    }

    const respuesta = respuestaError(new ErrorNuevoSinMapear());

    expect(respuesta.status).toBe(500);
    expect((await respuesta.json()).error.codigo).toBe("ERROR_INTERNO");
  });
});
