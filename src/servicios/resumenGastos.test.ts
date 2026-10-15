import { describe, expect, it } from "vitest";
import type { GastoDelViaje, Presupuesto } from "@/tipos/resumen";
import { compararConPresupuesto, filtrarGastos, resumirGastos } from "./resumenGastos";

let contador = 0;

function gasto(categoria: string, fechaGasto: string, montoConvertido: number): GastoDelViaje {
  contador += 1;
  return {
    id: `g-${contador}`,
    descripcion: `Gasto ${contador}`,
    categoria,
    fechaGasto,
    montoOriginal: montoConvertido,
    monedaOriginal: "ARS",
    montoConvertido,
    cotizacion: 1,
    fechaCotizacion: fechaGasto,
    creadoEn: `${fechaGasto}T12:00:00Z`,
  };
}

const gastos = [
  gasto("Comida y bebida", "2026-10-12", 15000),
  gasto("Transporte", "2026-10-12", 8000),
  gasto("Comida y bebida", "2026-10-13", 7000),
  gasto("Compras", "2026-10-14", 20000),
  gasto("Comida y bebida", "2026-10-14", 3000),
];

describe("filtrarGastos", () => {
  it("devuelve todo si no hay filtros", () => {
    expect(filtrarGastos(gastos, {})).toHaveLength(5);
  });

  it("filtra por categoría con el nombre exacto", () => {
    const filtrados = filtrarGastos(gastos, { categoria: "Comida y bebida" });

    expect(filtrados.map((g) => g.montoConvertido)).toEqual([15000, 7000, 3000]);
  });

  it("filtra por un día (desde = hasta)", () => {
    const filtrados = filtrarGastos(gastos, { desde: "2026-10-14", hasta: "2026-10-14" });

    expect(filtrados.map((g) => g.categoria)).toEqual(["Compras", "Comida y bebida"]);
  });

  it("incluye los dos extremos del rango", () => {
    expect(filtrarGastos(gastos, { desde: "2026-10-13", hasta: "2026-10-14" })).toHaveLength(3);
  });

  it("acepta un rango abierto de un lado", () => {
    expect(filtrarGastos(gastos, { desde: "2026-10-14" })).toHaveLength(2);
    expect(filtrarGastos(gastos, { hasta: "2026-10-12" })).toHaveLength(2);
  });

  it("combina categoría y fechas", () => {
    const filtrados = filtrarGastos(gastos, { categoria: "Comida y bebida", desde: "2026-10-13" });

    expect(filtrados.map((g) => g.montoConvertido)).toEqual([7000, 3000]);
  });

  it("devuelve una lista vacía si nada coincide", () => {
    expect(filtrarGastos(gastos, { categoria: "Salud y farmacia" })).toEqual([]);
  });
});

describe("resumirGastos", () => {
  const resumen = resumirGastos(gastos);

  it("suma el total y cuenta los gastos", () => {
    expect(resumen.total).toBe(53000);
    expect(resumen.cantidad).toBe(5);
  });

  it("agrupa por categoría, de la que más se gastó a la que menos, con su porcentaje del total", () => {
    expect(resumen.porCategoria).toEqual([
      { categoria: "Comida y bebida", total: 25000, cantidad: 3, porcentajeDelTotal: 47.2 },
      { categoria: "Compras", total: 20000, cantidad: 1, porcentajeDelTotal: 37.7 },
      { categoria: "Transporte", total: 8000, cantidad: 1, porcentajeDelTotal: 15.1 },
    ]);
  });

  it("agrupa por día, en orden cronológico", () => {
    expect(resumen.porDia).toEqual([
      { fecha: "2026-10-12", total: 23000, cantidad: 2 },
      { fecha: "2026-10-13", total: 7000, cantidad: 1 },
      { fecha: "2026-10-14", total: 23000, cantidad: 2 },
    ]);
  });

  it("desempata las categorías con el mismo monto por orden alfabético", () => {
    const iguales = resumirGastos([gasto("Transporte", "2026-10-12", 100), gasto("Compras", "2026-10-12", 100)]);

    expect(iguales.porCategoria.map((c) => c.categoria)).toEqual(["Compras", "Transporte"]);
  });

  it("suma centavos sin error de decimales", () => {
    const centavos = resumirGastos([gasto("Compras", "2026-10-12", 0.1), gasto("Compras", "2026-10-12", 0.2)]);

    expect(centavos.total).toBe(0.3);
  });

  it("con cero gastos todo es cero y no divide por cero", () => {
    expect(resumirGastos([])).toEqual({ total: 0, cantidad: 0, porCategoria: [], porDia: [] });
  });

  it("un gasto de monto cero no rompe los porcentajes", () => {
    const resumenCero = resumirGastos([gasto("Compras", "2026-10-12", 0)]);

    expect(resumenCero.porCategoria[0]?.porcentajeDelTotal).toBe(0);
  });
});

describe("compararConPresupuesto", () => {
  const presupuestoTotal: Presupuesto = { total: 100000, origen: "total", porCategoria: [] };

  const presupuestoPorCategoria: Presupuesto = {
    total: 80000,
    origen: "categorias",
    porCategoria: [
      { categoria: "Comida y bebida", monto: 30000 },
      { categoria: "Transporte", monto: 50000 },
      { categoria: "Salud y farmacia", monto: 0.5 },
    ],
  };

  it("con presupuesto total: cuánto se gastó, cuánto queda y qué porcentaje", () => {
    expect(compararConPresupuesto(presupuestoTotal, gastos)).toEqual({
      total: 100000,
      gastado: 53000,
      restante: 47000,
      porcentajeGastado: 53,
      porCategoria: [],
    });
  });

  it("con presupuesto por categoría: el avance de cada una", () => {
    const avance = compararConPresupuesto(presupuestoPorCategoria, gastos);

    expect(avance.porCategoria).toEqual([
      { categoria: "Comida y bebida", presupuesto: 30000, gastado: 25000, restante: 5000, porcentajeGastado: 83.3 },
      { categoria: "Transporte", presupuesto: 50000, gastado: 8000, restante: 42000, porcentajeGastado: 16 },
      { categoria: "Salud y farmacia", presupuesto: 0.5, gastado: 0, restante: 0.5, porcentajeGastado: 0 },
    ]);
  });

  it("el gasto total incluye las categorías que no tienen presupuesto", () => {
    const avance = compararConPresupuesto(presupuestoPorCategoria, gastos);

    // Compras (20.000) no tiene presupuesto, pero igual se gastó.
    expect(avance).toMatchObject({ total: 80000, gastado: 53000, restante: 27000, porcentajeGastado: 66.3 });
  });

  it("si se pasó del presupuesto, lo que queda es negativo y el porcentaje supera 100", () => {
    const presupuestoChico: Presupuesto = {
      total: 40000,
      origen: "categorias",
      porCategoria: [{ categoria: "Comida y bebida", monto: 20000 }],
    };

    const avance = compararConPresupuesto(presupuestoChico, gastos);

    expect(avance).toMatchObject({ restante: -13000, porcentajeGastado: 132.5 });
    expect(avance.porCategoria[0]).toMatchObject({ restante: -5000, porcentajeGastado: 125 });
  });

  it("sin gastos todavía: no se gastó nada y queda todo", () => {
    expect(compararConPresupuesto(presupuestoTotal, [])).toMatchObject({
      gastado: 0,
      restante: 100000,
      porcentajeGastado: 0,
    });
  });
});
