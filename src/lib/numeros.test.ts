import { describe, expect, it } from "vitest";
import {
  redondearADiezDecimales,
  redondearADosDecimales,
  redondearAUnDecimal,
  sumarMontos,
  tieneHastaDosDecimales,
} from "./numeros";

describe("tieneHastaDosDecimales", () => {
  it.each([1, 15000, 1500.5, 0.99, 12.34])("acepta %s", (numero) => {
    expect(tieneHastaDosDecimales(numero)).toBe(true);
  });

  it.each([10.555, 0.001, 1e-7])("rechaza %s", (numero) => {
    expect(tieneHastaDosDecimales(numero)).toBe(false);
  });
});

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

describe("redondearAUnDecimal", () => {
  it.each([
    [100 / 3, 33.3],
    [66.666, 66.7],
    [12.25, 12.3],
    [0, 0],
    [150, 150],
  ])("redondea %s a %s", (entrada, esperado) => {
    expect(redondearAUnDecimal(entrada)).toBe(esperado);
  });
});

describe("sumarMontos", () => {
  it("suma sin arrastrar el error de los decimales en binario", () => {
    expect(sumarMontos([0.1, 0.2])).toBe(0.3);
    expect(sumarMontos([1.1, 2.2, 3.3])).toBe(6.6);
  });

  it("suma montos grandes con centavos", () => {
    expect(sumarMontos([21750, 15000.5, 3])).toBe(36753.5);
  });

  it("da cero si no hay montos", () => {
    expect(sumarMontos([])).toBe(0);
  });
});
