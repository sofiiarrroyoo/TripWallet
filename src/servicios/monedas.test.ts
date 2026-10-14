import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCotizacionNoDisponible } from "@/errores";
import { obtenerTasas } from "@/integraciones/apiCotizaciones";
import { esMonedaSoportada, listarMonedas } from "./monedas";

vi.mock("@/integraciones/apiCotizaciones");

function tasasCon(...codigos: string[]) {
  return {
    monedaBase: "USD",
    tasas: Object.fromEntries(codigos.map((codigo) => [codigo, 1])),
    fecha: "2026-10-14",
    fuente: "prueba",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarMonedas", () => {
  it("devuelve cada código con su nombre en español, ordenadas por nombre", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("USD", "ARS", "EUR"));

    await expect(listarMonedas()).resolves.toEqual([
      { codigo: "USD", nombre: "Dólar estadounidense" },
      { codigo: "EUR", nombre: "Euro" },
      { codigo: "ARS", nombre: "Peso argentino" },
    ]);
  });

  it("usa el código como nombre si no conoce la moneda", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("XYZ"));

    await expect(listarMonedas()).resolves.toEqual([{ codigo: "XYZ", nombre: "XYZ" }]);
  });

  it("pide que la lista se reutilice durante un día", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("USD"));

    await listarMonedas();

    expect(obtenerTasas).toHaveBeenCalledWith("USD", { revalidarCadaSegundos: 86_400 });
  });

  it("explica que no se pudo cargar la lista si la API no responde", async () => {
    vi.mocked(obtenerTasas).mockRejectedValue(new ErrorCotizacionNoDisponible());

    await expect(listarMonedas()).rejects.toThrow(/lista de monedas/);
  });
});

describe("esMonedaSoportada", () => {
  it("indica si el código está entre los que soporta la API", async () => {
    vi.mocked(obtenerTasas).mockResolvedValue(tasasCon("USD", "ARS"));

    await expect(esMonedaSoportada("ARS")).resolves.toBe(true);
    await expect(esMonedaSoportada("XYZ")).resolves.toBe(false);
  });
});
