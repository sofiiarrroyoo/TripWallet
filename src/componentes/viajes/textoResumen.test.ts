import { describe, expect, it } from "vitest";
import { textoDeResumen } from "@/ia/resumenCierre";
import { partesDeResumen } from "./textoResumen";

describe("partesDeResumen", () => {
  it("separa el titular de los puntos", () => {
    expect(partesDeResumen("Gastaste mucho.\n\n- Uno\n- Dos")).toEqual({
      titular: "Gastaste mucho.",
      puntos: ["Uno", "Dos"],
    });
  });

  it("deshace lo que arma textoDeResumen al guardar", () => {
    const guardado = textoDeResumen({ titular: "Titular", puntos: ["Primero", "Segundo", "Tercero"] });

    expect(partesDeResumen(guardado)).toEqual({ titular: "Titular", puntos: ["Primero", "Segundo", "Tercero"] });
  });

  it("un texto sin puntos queda entero como titular", () => {
    expect(partesDeResumen("Solo una frase")).toEqual({ titular: "Solo una frase", puntos: [] });
  });

  it("ignora las líneas vacías y los espacios sobrantes", () => {
    expect(partesDeResumen("  Titular  \n\n\n -  Uno  \n")).toEqual({ titular: "Titular", puntos: ["Uno"] });
  });

  it("un texto vacío no tiene titular ni puntos", () => {
    expect(partesDeResumen("")).toEqual({ titular: "", puntos: [] });
  });
});
