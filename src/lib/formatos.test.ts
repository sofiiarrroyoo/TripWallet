import { describe, expect, it } from "vitest";
import { formatearMonto, formatearRangoFechas } from "./formatos";

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
