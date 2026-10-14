import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCotizacionNoDisponible, ErrorValidacion } from "@/errores";
import { obtenerTasas } from "@/integraciones/apiCotizaciones";
import * as repositorio from "@/repositorios/cotizaciones";
import type { CotizacionGuardada } from "@/tipos/cotizacion";
import { convertir, obtenerTasasDelDia } from "./cotizaciones";

vi.mock("@/repositorios/cotizaciones");
vi.mock("@/integraciones/apiCotizaciones");

const HOY = "2026-10-14";
const FUENTE = "ExchangeRate-API (open.er-api.com)";

// Base ARS: 1 ARS = 1/1,45 CLP, o sea 1 CLP = 1,45 ARS (el ejemplo de la tarjeta del chat).
const tasasArs = { ARS: 1, CLP: 1 / 1.45, USD: 0.001 };

function guardada(fecha: string, cambios: Partial<CotizacionGuardada> = {}): CotizacionGuardada {
  return { monedaBase: "ARS", fecha, tasas: tasasArs, fuente: FUENTE, obtenidaEn: `${fecha}T10:00:00Z`, ...cambios };
}

function apiResponde(fecha = HOY) {
  vi.mocked(obtenerTasas).mockResolvedValue({ monedaBase: "ARS", tasas: tasasArs, fecha, fuente: FUENTE });
}

function apiCaida() {
  vi.mocked(obtenerTasas).mockRejectedValue(new ErrorCotizacionNoDisponible(undefined, { cause: "HTTP 503" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${HOY}T15:00:00Z`));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(null);
  vi.mocked(repositorio.guardarCotizacion).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("obtenerTasasDelDia", () => {
  it("usa la cotización guardada si ya es de hoy, sin llamar a la API", async () => {
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(guardada(HOY));

    const tasas = await obtenerTasasDelDia("ARS");

    expect(tasas).toEqual({ monedaBase: "ARS", tasas: tasasArs, fecha: HOY, fuente: FUENTE, desactualizada: false });
    expect(obtenerTasas).not.toHaveBeenCalled();
    expect(repositorio.guardarCotizacion).not.toHaveBeenCalled();
  });

  it("consulta la API y guarda el resultado si la guardada es de otro día", async () => {
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(guardada("2026-10-13"));
    apiResponde();

    const tasas = await obtenerTasasDelDia("ARS");

    expect(tasas).toMatchObject({ fecha: HOY, desactualizada: false });
    expect(repositorio.guardarCotizacion).toHaveBeenCalledWith({
      monedaBase: "ARS",
      fecha: HOY,
      tasas: tasasArs,
      fuente: FUENTE,
    });
  });

  it("consulta la API si no hay nada guardado", async () => {
    apiResponde();

    await expect(obtenerTasasDelDia("ARS")).resolves.toMatchObject({ fecha: HOY, desactualizada: false });
    expect(obtenerTasas).toHaveBeenCalledWith("ARS");
  });

  it("si la API falla, usa la última guardada y marca que está desactualizada", async () => {
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(guardada("2026-10-12"));
    apiCaida();

    await expect(obtenerTasasDelDia("ARS")).resolves.toMatchObject({ fecha: "2026-10-12", desactualizada: true });
  });

  it("si la API falla y no hay nada guardado, informa que no hay cotización", async () => {
    apiCaida();

    await expect(obtenerTasasDelDia("ARS")).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);
  });

  it("devuelve las tasas aunque no se pueda guardar la caché", async () => {
    apiResponde();
    vi.mocked(repositorio.guardarCotizacion).mockRejectedValue(new Error("base caída"));

    await expect(obtenerTasasDelDia("ARS")).resolves.toMatchObject({ fecha: HOY });
  });

  it("no esconde errores que no son de la API de cotizaciones", async () => {
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(guardada("2026-10-12"));
    const error = new Error("falla inesperada");
    vi.mocked(obtenerTasas).mockRejectedValue(error);

    await expect(obtenerTasasDelDia("ARS")).rejects.toBe(error);
  });
});

describe("convertir", () => {
  beforeEach(() => {
    apiResponde();
  });

  it("convierte con la cotización del día y devuelve todo lo necesario para guardar el gasto", async () => {
    const conversion = await convertir({ monto: 15000, monedaOriginal: "CLP", monedaBase: "ARS" });

    expect(conversion).toEqual({
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      monedaBase: "ARS",
      cotizacion: 1.45,
      fechaCotizacion: HOY,
      fuente: FUENTE,
      aviso: null,
    });
  });

  it("pide las tasas con la moneda base como referencia", async () => {
    await convertir({ monto: 10, monedaOriginal: "USD", monedaBase: "ARS" });

    expect(obtenerTasas).toHaveBeenCalledWith("ARS");
  });

  it("redondea el monto convertido a 2 decimales", async () => {
    // 1 USD = 1000 ARS: 33,333 USD son 33.333 ARS sin que el error de los decimales en binario sume un centavo.
    const conversion = await convertir({ monto: 33.333, monedaOriginal: "USD", monedaBase: "ARS" });

    expect(conversion.montoConvertido).toBe(33333);
  });

  it("acepta códigos en minúscula y con espacios", async () => {
    const conversion = await convertir({ monto: 100, monedaOriginal: " clp ", monedaBase: "ars" });

    expect(conversion).toMatchObject({ monedaOriginal: "CLP", monedaBase: "ARS", montoConvertido: 145 });
  });

  it("no consulta la API si la moneda original es la misma que la base", async () => {
    const conversion = await convertir({ monto: 2000, monedaOriginal: "ARS", monedaBase: "ARS" });

    expect(conversion).toEqual({
      montoOriginal: 2000,
      monedaOriginal: "ARS",
      montoConvertido: 2000,
      monedaBase: "ARS",
      cotizacion: 1,
      fechaCotizacion: HOY,
      fuente: null,
      aviso: null,
    });
    expect(repositorio.obtenerUltimaCotizacion).not.toHaveBeenCalled();
    expect(obtenerTasas).not.toHaveBeenCalled();
  });

  it("avisa cuando se usó una cotización que no es de hoy", async () => {
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(guardada("2026-10-12"));
    apiCaida();

    const conversion = await convertir({ monto: 15000, monedaOriginal: "CLP", monedaBase: "ARS" });

    expect(conversion.fechaCotizacion).toBe("2026-10-12");
    expect(conversion.aviso).toMatch(/Usé la cotización del .*2026.* porque no pude consultar la de hoy\./);
  });

  it("falla con ErrorCotizacionNoDisponible si no hay forma de conseguir la cotización", async () => {
    apiCaida();

    await expect(
      convertir({ monto: 15000, monedaOriginal: "CLP", monedaBase: "ARS" }),
    ).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);
  });

  it("rechaza una moneda que la API no cotiza", async () => {
    const error = await convertir({ monto: 10, monedaOriginal: "XYZ", monedaBase: "ARS" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles).toEqual([
      { campo: "monedaOriginal", mensaje: "No tengo cotización para XYZ." },
    ]);
  });

  it.each([
    [{ monto: 0, monedaOriginal: "CLP", monedaBase: "ARS" }, "monto"],
    [{ monto: -5, monedaOriginal: "CLP", monedaBase: "ARS" }, "monto"],
    [{ monto: "15000", monedaOriginal: "CLP", monedaBase: "ARS" }, "monto"],
    [{ monto: 10, monedaOriginal: "pesos", monedaBase: "ARS" }, "monedaOriginal"],
    [{ monto: 10, monedaOriginal: "CLP" }, "monedaBase"],
  ])("rechaza datos inválidos sin llamar a la API (%j)", async (datos, campo) => {
    const error = await convertir(datos).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles.map((detalle) => detalle.campo)).toContain(campo);
    expect(obtenerTasas).not.toHaveBeenCalled();
  });
});
