import { describe, expect, it } from "vitest";
import type { GastoDelViaje, Presupuesto } from "@/tipos/resumen";
import type { Viaje } from "@/tipos/viaje";
import { CANTIDAD_GASTOS_MAS_GRANDES, calcularEstadisticas } from "./estadisticasViaje";

const viaje: Viaje = {
  id: "viaje-1",
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-10-10",
  fechaFin: "2026-10-19",
  presupuestoTotal: null,
  estado: "abierto",
  creadoEn: "2026-10-01T12:00:00Z",
};

let contador = 0;

function gasto(categoria: string, fechaGasto: string, montoConvertido: number, creadoEn?: string): GastoDelViaje {
  contador += 1;
  return {
    id: `g-${contador}`,
    descripcion: `Gasto ${contador}`,
    categoria,
    fechaGasto,
    montoOriginal: montoConvertido / 2,
    monedaOriginal: "CLP",
    montoConvertido,
    cotizacion: 2,
    fechaCotizacion: fechaGasto,
    creadoEn: creadoEn ?? `${fechaGasto}T12:00:00Z`,
  };
}

const gastos = [
  gasto("Comida y bebida", "2026-10-12", 15000),
  gasto("Transporte", "2026-10-12", 8000),
  gasto("Comida y bebida", "2026-10-13", 7000),
  gasto("Compras", "2026-10-14", 20000),
  gasto("Comida y bebida", "2026-10-14", 3000),
];

describe("calcularEstadisticas", () => {
  it("calcula total, cantidad y categorías con los cálculos de la consulta", () => {
    const estadisticas = calcularEstadisticas(viaje, gastos, null);

    expect(estadisticas).toMatchObject({ monedaBase: "ARS", total: 53000, cantidadGastos: 5 });
    expect(estadisticas.porCategoria.map((c) => c.categoria)).toEqual(["Comida y bebida", "Compras", "Transporte"]);
  });

  it("el promedio por día es el total sobre los días del viaje, no sobre los días con gastos", () => {
    const estadisticas = calcularEstadisticas(viaje, gastos, null);

    // Del 10 al 19 son 10 días; los gastos están en 3.
    expect(estadisticas.diasDelViaje).toBe(10);
    expect(estadisticas.promedioPorDia).toBe(5300);
  });

  it("redondea el promedio a dos decimales", () => {
    const estadisticas = calcularEstadisticas({ ...viaje, fechaFin: "2026-10-12" }, [gasto("Compras", "2026-10-10", 100)], null);

    expect(estadisticas.promedioPorDia).toBe(33.33);
  });

  it("los gastos más grandes van del mayor al menor", () => {
    const { gastosMasGrandes } = calcularEstadisticas(viaje, gastos, null);

    expect(gastosMasGrandes.map((g) => g.montoConvertido)).toEqual([20000, 15000, 8000, 7000, 3000]);
    expect(gastosMasGrandes[0]).toEqual({
      id: expect.any(String),
      descripcion: expect.any(String),
      categoria: "Compras",
      fechaGasto: "2026-10-14",
      montoOriginal: 10000,
      monedaOriginal: "CLP",
      montoConvertido: 20000,
    });
  });

  it("se queda con los 5 más grandes", () => {
    const muchos = Array.from({ length: 8 }, (_, i) => gasto("Compras", "2026-10-12", (i + 1) * 100));

    const { gastosMasGrandes } = calcularEstadisticas(viaje, muchos, null);

    expect(gastosMasGrandes).toHaveLength(CANTIDAD_GASTOS_MAS_GRANDES);
    expect(gastosMasGrandes.map((g) => g.montoConvertido)).toEqual([800, 700, 600, 500, 400]);
  });

  it("a igual monto, desempata por el que se cargó primero", () => {
    const tarde = gasto("Compras", "2026-10-12", 500, "2026-10-12T20:00:00Z");
    const temprano = gasto("Compras", "2026-10-12", 500, "2026-10-12T08:00:00Z");

    const { gastosMasGrandes } = calcularEstadisticas(viaje, [tarde, temprano], null);

    expect(gastosMasGrandes.map((g) => g.id)).toEqual([temprano.id, tarde.id]);
  });

  it("no modifica la lista de gastos que recibe", () => {
    const original = [...gastos];

    calcularEstadisticas(viaje, gastos, null);

    expect(gastos).toEqual(original);
  });

  it("sin presupuesto, no compara", () => {
    expect(calcularEstadisticas(viaje, gastos, null).presupuesto).toBeNull();
  });

  it("con presupuesto, compara lo planificado contra lo real por categoría", () => {
    const presupuesto: Presupuesto = {
      total: 80000,
      origen: "categorias",
      porCategoria: [
        { categoria: "Comida y bebida", monto: 30000 },
        { categoria: "Transporte", monto: 50000 },
      ],
    };

    const { presupuesto: avance } = calcularEstadisticas(viaje, gastos, presupuesto);

    expect(avance).toMatchObject({ total: 80000, gastado: 53000, restante: 27000, porcentajeGastado: 66.3 });
    expect(avance?.porCategoria).toEqual([
      { categoria: "Comida y bebida", presupuesto: 30000, gastado: 25000, restante: 5000, porcentajeGastado: 83.3 },
      { categoria: "Transporte", presupuesto: 50000, gastado: 8000, restante: 42000, porcentajeGastado: 16 },
    ]);
  });
});
