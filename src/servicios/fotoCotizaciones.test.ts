import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCotizacionNoDisponible } from "@/errores";
import * as repositorio from "@/repositorios/cotizaciones";
import type { CotizacionGuardada } from "@/tipos/cotizacion";
import { obtenerTasasDelDia } from "./cotizaciones";
import { obtenerFotoCotizaciones } from "./fotoCotizaciones";

vi.mock("@/repositorios/cotizaciones");
vi.mock("./cotizaciones");

const FUENTE = "ExchangeRate-API (open.er-api.com)";

const tasasEnUsd = { USD: 1, ARS: 1450, CLP: 950 };

// 1 ARS = 0,000689655 USD (1 USD = 1450 ARS) y 1 ARS = 0,655172 CLP.
const guardadaEnArs: CotizacionGuardada = {
  monedaBase: "ARS",
  fecha: "2026-10-10",
  tasas: { ARS: 1, USD: 0.0005, CLP: 0.5 },
  fuente: FUENTE,
  obtenidaEn: "2026-10-10T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerTasasDelDia).mockResolvedValue({
    monedaBase: "USD",
    tasas: tasasEnUsd,
    fecha: "2026-10-15",
    fuente: FUENTE,
    desactualizada: false,
  });
  vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(null);
});

describe("obtenerFotoCotizaciones", () => {
  it("usa la cotización de hoy en dólares", async () => {
    await expect(obtenerFotoCotizaciones("ARS")).resolves.toEqual({
      monedaBase: "USD",
      fecha: "2026-10-15",
      fuente: FUENTE,
      tasas: tasasEnUsd,
      desactualizada: false,
    });
    expect(obtenerTasasDelDia).toHaveBeenCalledWith("USD");
  });

  it("si la API falló y hay una guardada en dólares, la usa con su fecha real y marcada como desactualizada", async () => {
    vi.mocked(obtenerTasasDelDia).mockResolvedValue({
      monedaBase: "USD",
      tasas: tasasEnUsd,
      fecha: "2026-10-12",
      fuente: FUENTE,
      desactualizada: true,
    });

    await expect(obtenerFotoCotizaciones("ARS")).resolves.toMatchObject({ fecha: "2026-10-12", desactualizada: true });
    expect(repositorio.obtenerUltimaCotizacion).not.toHaveBeenCalled();
  });

  it("sin cotización en dólares, convierte la última guardada en la moneda base del viaje", async () => {
    vi.mocked(obtenerTasasDelDia).mockRejectedValue(new ErrorCotizacionNoDisponible());
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue(guardadaEnArs);

    const foto = await obtenerFotoCotizaciones("ARS");

    expect(repositorio.obtenerUltimaCotizacion).toHaveBeenCalledWith("ARS");
    expect(foto).toEqual({
      monedaBase: "USD",
      fecha: "2026-10-10",
      fuente: FUENTE,
      tasas: { ARS: 2000, USD: 1, CLP: 1000 },
      desactualizada: true,
    });
  });

  it("agrega la moneda base si la cotización guardada no la incluía", async () => {
    vi.mocked(obtenerTasasDelDia).mockRejectedValue(new ErrorCotizacionNoDisponible());
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue({
      ...guardadaEnArs,
      tasas: { USD: 0.0005, CLP: 0.5 },
    });

    expect((await obtenerFotoCotizaciones("ARS")).tasas.ARS).toBe(2000);
  });

  it("si no hay ninguna cotización guardada, no se puede armar la foto", async () => {
    vi.mocked(obtenerTasasDelDia).mockRejectedValue(new ErrorCotizacionNoDisponible());

    await expect(obtenerFotoCotizaciones("ARS")).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);
  });

  it("si la guardada no incluye el dólar, no se puede convertir y falla", async () => {
    vi.mocked(obtenerTasasDelDia).mockRejectedValue(new ErrorCotizacionNoDisponible());
    vi.mocked(repositorio.obtenerUltimaCotizacion).mockResolvedValue({ ...guardadaEnArs, tasas: { ARS: 1, CLP: 0.5 } });

    await expect(obtenerFotoCotizaciones("ARS")).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);
  });

  it("si el viaje ya es en dólares, no busca otra guardada: no hay nada más que convertir", async () => {
    vi.mocked(obtenerTasasDelDia).mockRejectedValue(new ErrorCotizacionNoDisponible());

    await expect(obtenerFotoCotizaciones("USD")).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);
    expect(repositorio.obtenerUltimaCotizacion).not.toHaveBeenCalled();
  });

  it("propaga los errores que no son de cotización no disponible", async () => {
    const caida = new Error("falla inesperada");
    vi.mocked(obtenerTasasDelDia).mockRejectedValue(caida);

    await expect(obtenerFotoCotizaciones("ARS")).rejects.toBe(caida);
    expect(repositorio.obtenerUltimaCotizacion).not.toHaveBeenCalled();
  });
});
