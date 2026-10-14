import { describe, expect, it } from "vitest";
import { leerMonto } from "./leerMonto";

describe("leerMonto", () => {
  it("devuelve vacío si no se escribió nada", () => {
    expect(leerMonto("   ")).toEqual({ tipo: "vacio" });
  });

  it.each([
    ["1500", 1500],
    ["1500,5", 1500.5],
    ["1500.50", 1500.5],
    [" 0,99 ", 0.99],
  ])("lee %s como %s", (texto, monto) => {
    expect(leerMonto(texto)).toEqual({ tipo: "valido", monto });
  });

  it.each(["1.500", "1.500,50", "12,345", "-100", "abc", "1e3"])("rechaza %s", (texto) => {
    expect(leerMonto(texto)).toEqual({ tipo: "invalido" });
  });
});
