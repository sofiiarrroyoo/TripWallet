import { describe, expect, it } from "vitest";
import { esquemaCrearCategoria } from "./categorias";

function mensajes(datos: unknown): string[] {
  const resultado = esquemaCrearCategoria.safeParse(datos);
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
}

describe("esquemaCrearCategoria", () => {
  it("recorta y colapsa los espacios del nombre", () => {
    expect(esquemaCrearCategoria.parse({ nombre: "  Souvenirs \t y   regalos " })).toEqual({
      nombre: "Souvenirs y regalos",
    });
  });

  it("acepta un nombre de exactamente 50 caracteres y rechaza uno de 51", () => {
    expect(mensajes({ nombre: "a".repeat(50) })).toEqual([]);
    expect(mensajes({ nombre: "a".repeat(51) })).toEqual(["El nombre puede tener hasta 50 caracteres."]);
  });

  it.each(["", "   ", "\n\t"])("rechaza un nombre vacío (%j)", (nombre) => {
    expect(mensajes({ nombre })).toEqual(["Indicá el nombre de la categoría."]);
  });

  it.each([undefined, 42, null])("rechaza un nombre que no es texto (%j)", (nombre) => {
    expect(mensajes({ nombre })).toEqual(["Indicá el nombre de la categoría."]);
  });
});
