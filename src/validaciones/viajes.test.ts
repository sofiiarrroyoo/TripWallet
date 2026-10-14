import { describe, expect, it } from "vitest";
import { esquemaCrearViaje } from "./viajes";

const viajeValido = {
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-10",
};

function camposConError(datos: unknown): string[] {
  const resultado = esquemaCrearViaje.safeParse(datos);
  if (resultado.success) return [];
  return [...new Set(resultado.error.issues.map((issue) => issue.path.join(".")))];
}

describe("esquemaCrearViaje", () => {
  it("acepta un viaje sin presupuesto y lo normaliza a null", () => {
    expect(esquemaCrearViaje.parse(viajeValido).presupuestoTotal).toBeNull();
  });

  it("recorta los textos y pasa la moneda a mayúsculas", () => {
    const viaje = esquemaCrearViaje.parse({ ...viajeValido, nombre: "  Chile  ", monedaBase: " ars " });

    expect(viaje.nombre).toBe("Chile");
    expect(viaje.monedaBase).toBe("ARS");
  });

  it("acepta un viaje de un solo día", () => {
    expect(camposConError({ ...viajeValido, fechaFin: viajeValido.fechaInicio })).toEqual([]);
  });

  it("rechaza que la fecha de fin sea anterior a la de inicio", () => {
    expect(camposConError({ ...viajeValido, fechaFin: "2026-10-31" })).toEqual(["fechaFin"]);
  });

  it.each([
    ["nombre", { nombre: "   " }],
    ["destino", { destino: "a".repeat(101) }],
    ["monedaBase", { monedaBase: "PESOS" }],
    ["fechaInicio", { fechaInicio: "01/11/2026" }],
    ["fechaFin", { fechaFin: "2026-02-30" }],
  ])("rechaza un %s inválido", (campo, cambio) => {
    expect(camposConError({ ...viajeValido, ...cambio })).toContain(campo);
  });

  it.each([0, -100, 10.555, 1e13])("rechaza el presupuesto %s", (presupuestoTotal) => {
    expect(camposConError({ ...viajeValido, presupuestoTotal })).toEqual(["presupuestoTotal"]);
  });

  it("acepta un presupuesto positivo con hasta 2 decimales", () => {
    expect(esquemaCrearViaje.parse({ ...viajeValido, presupuestoTotal: 1500.5 }).presupuestoTotal).toBe(1500.5);
  });

  it("rechaza un presupuesto que llega como texto", () => {
    expect(camposConError({ ...viajeValido, presupuestoTotal: "1500" })).toEqual(["presupuestoTotal"]);
  });
});
