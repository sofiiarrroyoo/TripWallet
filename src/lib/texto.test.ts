import { describe, expect, it } from "vitest";
import { colapsarEspacios, normalizarParaBuscar } from "./texto";

describe("normalizarParaBuscar", () => {
  it.each([
    ["Dólar", "dolar"],
    ["  COMUNICACIÓN ", "comunicacion"],
    ["Peso Chileno", "peso chileno"],
    ["ñandú", "nandu"],
  ])("normaliza %j como %j", (entrada, esperado) => {
    expect(normalizarParaBuscar(entrada)).toBe(esperado);
  });
});

describe("colapsarEspacios", () => {
  it.each([
    ["  Comida   y\tbebida \n", "Comida y bebida"],
    ["Compras", "Compras"],
    ["   ", ""],
  ])("convierte %j en %j", (entrada, esperado) => {
    expect(colapsarEspacios(entrada)).toBe(esperado);
  });
});
