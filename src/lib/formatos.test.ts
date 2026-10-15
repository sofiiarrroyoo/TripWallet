import { describe, expect, it } from "vitest";
import { formatearCotizacion, formatearMonto, formatearPorcentaje, formatearRangoFechas } from "./formatos";

// Intl usa espacios especiales (no separables) que no importan para estos tests.
function normalizarEspacios(texto: string): string {
  return texto.replace(/\s/g, " ");
}

describe("formatearRangoFechas", () => {
  it.each([
    ["2026-11-01", "2026-11-10", "1 – 10 de nov de 2026"],
    ["2026-10-28", "2026-11-03", "28 de oct al 3 de nov de 2026"],
    ["2026-12-28", "2027-01-03", "28 de dic de 2026 al 3 de ene de 2027"],
    ["2026-11-01", "2026-11-01", "1 de nov de 2026"],
  ])("formatea del %s al %s", (inicio, fin, esperado) => {
    expect(normalizarEspacios(formatearRangoFechas(inicio, fin))).toBe(esperado);
  });
});

describe("formatearMonto", () => {
  it("usa el código de la moneda y el formato argentino", () => {
    expect(normalizarEspacios(formatearMonto(1500.5, "ARS"))).toBe("ARS 1.500,50");
  });

  it("respeta los decimales de cada moneda", () => {
    expect(normalizarEspacios(formatearMonto(15000, "CLP"))).toBe("CLP 15.000");
  });
});

describe("formatearPorcentaje", () => {
  it.each([
    [47.2, "47,2 %"],
    [100, "100 %"],
    [0, "0 %"],
    [132.5, "132,5 %"],
    [1234.5, "1.234,5 %"],
  ])("formatea %s como %s", (porcentaje, esperado) => {
    expect(normalizarEspacios(formatearPorcentaje(porcentaje))).toBe(esperado);
  });
});

describe("formatearCotizacion", () => {
  it.each([
    [1.5529807135, "1,55298"],
    [1450.5, "1.450,5"],
    [1.45, "1,45"],
    [0.0000238095, "0,0000238095"],
    [1, "1"],
  ])("formatea %s como %s", (cotizacion, esperado) => {
    expect(normalizarEspacios(formatearCotizacion(cotizacion))).toBe(esperado);
  });
});
