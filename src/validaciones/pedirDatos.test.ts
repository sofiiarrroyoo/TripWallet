import { describe, expect, it } from "vitest";
import { esquemaPedirDatos, textoDePedirDatos } from "./pedirDatos";

describe("esquemaPedirDatos", () => {
  it("acepta una pregunta con entre 2 y 6 opciones", () => {
    const datos = { pregunta: "¿Qué pesos?", opciones: ["Argentinos", "Chilenos"] };

    expect(esquemaPedirDatos.parse(datos)).toEqual(datos);
  });

  it.each([
    [{ pregunta: "¿Qué pesos?", opciones: ["Argentinos"] }],
    [{ pregunta: "¿Qué pesos?", opciones: ["a", "b", "c", "d", "e", "f", "g"] }],
    [{ opciones: ["a", "b"] }],
    [{ pregunta: "¿Qué pesos?" }],
    [{ pregunta: "¿Qué pesos?", opciones: ["Argentinos", ""] }],
    [{ pregunta: "¿Qué pesos?", opciones: ["Argentinos", "a".repeat(101)] }],
    [{ pregunta: "a".repeat(301), opciones: ["Argentinos", "Chilenos"] }],
  ])("rechaza %j", (datos) => {
    expect(esquemaPedirDatos.safeParse(datos).success).toBe(false);
  });
});

describe("textoDePedirDatos", () => {
  it("junta la pregunta con sus opciones", () => {
    expect(textoDePedirDatos({ pregunta: "¿Qué pesos?", opciones: ["Argentinos", "Chilenos"] })).toBe(
      "¿Qué pesos?\nOpciones: Argentinos / Chilenos",
    );
  });
});
