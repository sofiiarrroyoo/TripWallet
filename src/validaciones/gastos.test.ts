import { describe, expect, it } from "vitest";
import { esquemaRegistrarGasto } from "./gastos";

const gastoValido = { monto: 15000, moneda: "CLP", categoria: "Comida y bebida", descripcion: "Cena" };

function camposConError(datos: unknown): string[] {
  const resultado = esquemaRegistrarGasto.safeParse(datos);
  if (resultado.success) return [];
  return [...new Set(resultado.error.issues.map((issue) => issue.path.join(".")))];
}

describe("esquemaRegistrarGasto", () => {
  it("acepta un gasto sin fecha", () => {
    expect(esquemaRegistrarGasto.parse(gastoValido)).toEqual(gastoValido);
  });

  it("normaliza la moneda, la categoría y la descripción", () => {
    const gasto = esquemaRegistrarGasto.parse({
      monto: 2000,
      moneda: " ars ",
      categoria: "  Comida   y bebida ",
      descripcion: "  Choclo \t con   sal ",
      fecha: "2026-10-14",
    });

    expect(gasto).toEqual({
      monto: 2000,
      moneda: "ARS",
      categoria: "Comida y bebida",
      descripcion: "Choclo con sal",
      fecha: "2026-10-14",
    });
  });

  it.each([0, -5, 10.555, 1e13, "15000", null])("rechaza el monto %j", (monto) => {
    expect(camposConError({ ...gastoValido, monto })).toEqual(["monto"]);
  });

  it("acepta un monto con 2 decimales", () => {
    expect(camposConError({ ...gastoValido, monto: 1500.5 })).toEqual([]);
  });

  it.each(["pesos", "CL", "", "123"])("rechaza la moneda %j", (moneda) => {
    expect(camposConError({ ...gastoValido, moneda })).toEqual(["moneda"]);
  });

  it.each(["", "   ", "a".repeat(201)])("rechaza la descripción %j", (descripcion) => {
    expect(camposConError({ ...gastoValido, descripcion })).toEqual(["descripcion"]);
  });

  it("acepta una descripción de exactamente 200 caracteres", () => {
    expect(camposConError({ ...gastoValido, descripcion: "a".repeat(200) })).toEqual([]);
  });

  it("rechaza una categoría vacía", () => {
    expect(camposConError({ ...gastoValido, categoria: "  " })).toEqual(["categoria"]);
  });

  it.each(["14/10/2026", "2026-02-30", "ayer", 20261014])("rechaza la fecha %j", (fecha) => {
    expect(camposConError({ ...gastoValido, fecha })).toEqual(["fecha"]);
  });

  it("pide todos los datos obligatorios", () => {
    expect(camposConError({})).toEqual(["monto", "moneda", "categoria", "descripcion"]);
  });
});
