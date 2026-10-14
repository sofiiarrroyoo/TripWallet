import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErrorValidacion } from "@/errores";
import { validar } from "./validar";

const esquema = z.object({
  nombre: z.string().min(1, "Falta el nombre."),
  destino: z.object({ ciudad: z.string().min(1, "Falta la ciudad.") }),
});

describe("validar", () => {
  it("devuelve los datos transformados por el esquema cuando son válidos", () => {
    const esquemaConTrim = z.object({ nombre: z.string().trim() });

    expect(validar(esquemaConTrim, { nombre: "  Chile  " })).toEqual({ nombre: "Chile" });
  });

  it("lanza ErrorValidacion con un detalle por campo inválido, incluidos los anidados", () => {
    const error = capturarError(() => validar(esquema, { nombre: "", destino: { ciudad: "" } }));

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles).toEqual([
      { campo: "nombre", mensaje: "Falta el nombre." },
      { campo: "destino.ciudad", mensaje: "Falta la ciudad." },
    ]);
  });

  it("rechaza datos que no son un objeto", () => {
    expect(() => validar(esquema, null)).toThrow(ErrorValidacion);
  });
});

function capturarError(funcion: () => unknown): unknown {
  try {
    funcion();
  } catch (error) {
    return error;
  }
  throw new Error("Se esperaba que la función lanzara un error");
}
