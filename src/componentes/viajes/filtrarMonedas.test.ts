import { describe, expect, it } from "vitest";
import { filtrarMonedas, textoDeMoneda } from "./filtrarMonedas";

const monedas = [
  { codigo: "CLP", nombre: "Peso chileno" },
  { codigo: "USD", nombre: "Dólar estadounidense" },
  { codigo: "EUR", nombre: "Euro" },
  { codigo: "ARS", nombre: "Peso argentino" },
  { codigo: "AUD", nombre: "Dólar australiano" },
];

function codigos(texto: string): string[] {
  return filtrarMonedas(monedas, texto).map((moneda) => moneda.codigo);
}

describe("filtrarMonedas", () => {
  it("devuelve todas si no hay búsqueda", () => {
    expect(codigos("  ")).toEqual(["CLP", "USD", "EUR", "ARS", "AUD"]);
  });

  it("pone primero la coincidencia exacta del código", () => {
    expect(codigos("ars")).toEqual(["ARS"]);
    expect(codigos("eur")).toEqual(["EUR"]);
  });

  it("prioriza los códigos que empiezan con la búsqueda", () => {
    expect(codigos("a")).toEqual(["ARS", "AUD", "USD"]);
  });

  it("busca en el nombre sin importar tildes ni mayúsculas", () => {
    expect(codigos("DOLAR")).toEqual(["USD", "AUD"]);
  });

  it("encuentra palabras del medio del nombre", () => {
    expect(codigos("chileno")).toEqual(["CLP"]);
  });

  it("devuelve una lista vacía si nada coincide", () => {
    expect(codigos("bitcoin")).toEqual([]);
  });
});

describe("textoDeMoneda", () => {
  it("muestra el código y el nombre", () => {
    expect(textoDeMoneda({ codigo: "ARS", nombre: "Peso argentino" })).toBe("ARS · Peso argentino");
  });
});
