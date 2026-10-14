import { describe, expect, it } from "vitest";
import { redondearADiezDecimales, redondearADosDecimales } from "./numeros";

describe("redondearADosDecimales", () => {
  it.each([
    [1.005, 1.01],
    [33.333 * 1000, 33333],
    [2.675, 2.68],
    [0.1 + 0.2, 0.3],
    [21750, 21750],
    [0.004, 0],
  ])("redondea %s a %s", (entrada, esperado) => {
    expect(redondearADosDecimales(entrada)).toBe(esperado);
  });
});

describe("redondearADiezDecimales", () => {
  it("limpia el error de la división en binario", () => {
    expect(redondearADiezDecimales(1 / (1 / 1.45))).toBe(1.45);
  });

  it("conserva 10 decimales", () => {
    expect(redondearADiezDecimales(1 / 3)).toBe(0.3333333333);
  });
});
