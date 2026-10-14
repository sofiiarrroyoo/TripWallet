import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCotizacionNoDisponible } from "@/errores";
import { obtenerTasas } from "@/integraciones/apiCotizaciones";
import { esMonedaSoportada, listarMonedas } from "./monedas";
import { CODIGOS_ISO_4217 } from "./monedasRespaldo";

vi.mock("@/integraciones/apiCotizaciones");

function tasasCon(...codigos: string[]) {
  return {
    monedaBase: "USD",
    tasas: Object.fromEntries(codigos.map((codigo) => [codigo, 1])),
    fecha: "2026-10-14",
    fuente: "prueba",
  };
}

function simularApiCaida() {
  vi.mocked(obtenerTasas).mockRejectedValue(new ErrorCotizacionNoDisponible(undefined, { cause: "HTTP 503" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("listarMonedas", () => {
  it("devuelve las monedas de la API con su nombre en español, ordenadas por nombre", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("USD", "ARS", "EUR"));

    await expect(listarMonedas()).resolves.toEqual({
      monedas: [
        { codigo: "USD", nombre: "Dólar estadounidense" },
        { codigo: "EUR", nombre: "Euro" },
        { codigo: "ARS", nombre: "Peso argentino" },
      ],
      fuente: "api",
    });
  });

  it("usa el código como nombre si no conoce la moneda", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("XYZ"));

    const { monedas } = await listarMonedas();

    expect(monedas).toEqual([{ codigo: "XYZ", nombre: "XYZ" }]);
  });

  it("pide que la lista se reutilice durante un día", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("USD"));

    await listarMonedas();

    expect(obtenerTasas).toHaveBeenCalledWith("USD", { revalidarCadaSegundos: 86_400 });
  });

  it("usa la lista ISO 4217 del proyecto si la API no responde", async () => {
    simularApiCaida();

    const { monedas, fuente } = await listarMonedas();

    expect(fuente).toBe("respaldo");
    expect(monedas).toHaveLength(CODIGOS_ISO_4217.length);
    expect(monedas).toContainEqual({ codigo: "ARS", nombre: "Peso argentino" });
  });

  it("no oculta errores que no son de la API de cotizaciones", async () => {
    const error = new Error("falla inesperada");
    vi.mocked(obtenerTasas).mockRejectedValue(error);

    await expect(listarMonedas()).rejects.toBe(error);
  });
});

describe("esMonedaSoportada", () => {
  it("indica si el código está entre los que soporta la API", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("USD", "ARS"));

    await expect(esMonedaSoportada("ARS")).resolves.toBe(true);
    await expect(esMonedaSoportada("XYZ")).resolves.toBe(false);
  });

  it("con la API caída, acepta las monedas de la lista de respaldo", async () => {
    simularApiCaida();

    await expect(esMonedaSoportada("CLP")).resolves.toBe(true);
    await expect(esMonedaSoportada("XYZ")).resolves.toBe(false);
  });
});

describe("lista de respaldo", () => {
  it("tiene códigos de 3 letras sin repetir", () => {
    expect(CODIGOS_ISO_4217.every((codigo) => /^[A-Z]{3}$/.test(codigo))).toBe(true);
    expect(new Set(CODIGOS_ISO_4217).size).toBe(CODIGOS_ISO_4217.length);
  });
});
