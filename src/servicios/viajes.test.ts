import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCotizacionNoDisponible, ErrorNoEncontrado, ErrorValidacion } from "@/errores";
import * as repositorio from "@/repositorios/viajes";
import type { Viaje } from "@/tipos/viaje";
import { esMonedaSoportada } from "./monedas";
import { crearViaje, listarViajes, obtenerViaje } from "./viajes";

vi.mock("@/repositorios/viajes");
vi.mock("./monedas");

const ID_VALIDO = "3f2b8c1e-4a5d-4e6f-8a7b-9c0d1e2f3a4b";

const viaje: Viaje = {
  id: ID_VALIDO,
  nombre: "Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-10",
  presupuestoTotal: null,
  estado: "abierto",
  creadoEn: "2026-10-14T12:00:00Z",
};

const datosValidos = {
  nombre: " Chile ",
  destino: "Santiago",
  monedaBase: "ars",
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-10",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(esMonedaSoportada).mockResolvedValue(true);
  vi.mocked(repositorio.crearViaje).mockResolvedValue(viaje);
});

describe("crearViaje", () => {
  it("valida, normaliza y guarda el viaje", async () => {
    await expect(crearViaje(datosValidos)).resolves.toEqual(viaje);

    expect(esMonedaSoportada).toHaveBeenCalledWith("ARS");
    expect(repositorio.crearViaje).toHaveBeenCalledWith({
      nombre: "Chile",
      destino: "Santiago",
      monedaBase: "ARS",
      fechaInicio: "2026-11-01",
      fechaFin: "2026-11-10",
      presupuestoTotal: null,
    });
  });

  it("no guarda si los datos son inválidos y no consulta las monedas", async () => {
    const error = await crearViaje({ ...datosValidos, fechaFin: "2026-10-01" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles.map((detalle) => detalle.campo)).toEqual(["fechaFin"]);
    expect(esMonedaSoportada).not.toHaveBeenCalled();
    expect(repositorio.crearViaje).not.toHaveBeenCalled();
  });

  it("rechaza una moneda que la API de cotizaciones no soporta", async () => {
    vi.mocked(esMonedaSoportada).mockResolvedValue(false);

    const error = await crearViaje({ ...datosValidos, monedaBase: "XYZ" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles).toEqual([
      { campo: "monedaBase", mensaje: "Elegí una moneda de la lista." },
    ]);
    expect(repositorio.crearViaje).not.toHaveBeenCalled();
  });

  it("no guarda si no se puede verificar la moneda", async () => {
    vi.mocked(esMonedaSoportada).mockRejectedValue(new ErrorCotizacionNoDisponible());

    await expect(crearViaje(datosValidos)).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);
    expect(repositorio.crearViaje).not.toHaveBeenCalled();
  });

  it("rechaza un presupuesto no positivo", async () => {
    await expect(crearViaje({ ...datosValidos, presupuestoTotal: 0 })).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

describe("obtenerViaje", () => {
  it("devuelve el viaje si existe", async () => {
    vi.mocked(repositorio.obtenerViaje).mockResolvedValue(viaje);

    await expect(obtenerViaje(ID_VALIDO)).resolves.toEqual(viaje);
  });

  it("lanza ErrorNoEncontrado si no existe o es de otro usuario", async () => {
    vi.mocked(repositorio.obtenerViaje).mockResolvedValue(null);

    await expect(obtenerViaje(ID_VALIDO)).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("trata un id mal formado como inexistente sin consultar la base", async () => {
    await expect(obtenerViaje("no-es-un-uuid")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(repositorio.obtenerViaje).not.toHaveBeenCalled();
  });
});

describe("listarViajes", () => {
  it("devuelve los viajes del repositorio", async () => {
    vi.mocked(repositorio.listarViajes).mockResolvedValue([viaje]);

    await expect(listarViajes()).resolves.toEqual([viaje]);
  });
});
