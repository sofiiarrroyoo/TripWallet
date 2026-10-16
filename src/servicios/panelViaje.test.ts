import { describe, expect, it } from "vitest";
import type { GastoDelViaje, Presupuesto } from "@/tipos/resumen";
import type { Viaje } from "@/tipos/viaje";
import { CANTIDAD_ULTIMOS_GASTOS, calcularPanel } from "./panelViaje";

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

function gasto(categoria: string, fechaGasto: string, montoConvertido: number): GastoDelViaje {
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
    creadoEn: `${fechaGasto}T12:00:00Z`,
  };
}

// Del más reciente al más viejo, como los devuelve el repositorio.
const gastos = [
  gasto("Comida y bebida", "2026-10-14", 3000),
  gasto("Compras", "2026-10-14", 20000),
  gasto("Comida y bebida", "2026-10-13", 7000),
  gasto("Transporte", "2026-10-12", 8000),
  gasto("Comida y bebida", "2026-10-12", 15000),
];

describe("calcularPanel", () => {
  it("suma lo gastado y arma las categorías con su porcentaje", () => {
    const panel = calcularPanel(viaje, gastos, null, "2026-10-14");

    expect(panel).toMatchObject({ monedaBase: "ARS", gastado: 53000, cantidadGastos: 5, presupuesto: null });
    expect(panel.porCategoria.map((c) => [c.categoria, c.total])).toEqual([
      ["Comida y bebida", 25000],
      ["Compras", 20000],
      ["Transporte", 8000],
    ]);
  });

  it("con el viaje abierto promedia sobre los días que ya pasaron, contando hoy", () => {
    const panel = calcularPanel(viaje, gastos, null, "2026-10-14");

    // Del 10 al 14 son 5 días.
    expect(panel.diasPromedio).toBe(5);
    expect(panel.promedioPorDia).toBe(10600);
  });

  it("antes de que empiece el viaje promedia sobre un día, sin dividir por cero ni por negativos", () => {
    const panel = calcularPanel(viaje, [], null, "2026-10-01");

    expect(panel.diasPromedio).toBe(1);
    expect(panel.promedioPorDia).toBe(0);
  });

  it("pasada la fecha de fin promedia sobre todos los días del viaje", () => {
    const panel = calcularPanel(viaje, gastos, null, "2026-11-30");

    expect(panel.diasPromedio).toBe(10);
    expect(panel.promedioPorDia).toBe(5300);
  });

  it("con el viaje cerrado promedia sobre todos los días, aunque la fecha de hoy sea anterior", () => {
    const panel = calcularPanel({ ...viaje, estado: "cerrado" }, gastos, null, "2026-10-14");

    expect(panel.diasPromedio).toBe(10);
    expect(panel.promedioPorDia).toBe(5300);
  });

  it("muestra solo los últimos gastos, en el orden en que llegan", () => {
    const muchos = Array.from({ length: CANTIDAD_ULTIMOS_GASTOS + 3 }, (_, i) =>
      gasto("Otros", "2026-10-12", 100 + i),
    );

    const panel = calcularPanel(viaje, muchos, null, "2026-10-14");

    expect(panel.ultimosGastos).toEqual(muchos.slice(0, CANTIDAD_ULTIMOS_GASTOS));
    // Los totales incluyen todos, no solo los que se listan.
    expect(panel.cantidadGastos).toBe(CANTIDAD_ULTIMOS_GASTOS + 3);
  });

  it("compara contra el presupuesto: cuánto queda y qué porcentaje se gastó", () => {
    const presupuesto: Presupuesto = { total: 106000, origen: "total", porCategoria: [] };

    const panel = calcularPanel(viaje, gastos, presupuesto, "2026-10-14");

    expect(panel.presupuesto).toMatchObject({ total: 106000, gastado: 53000, restante: 53000, porcentajeGastado: 50 });
  });

  it("si se pasó del presupuesto, lo que queda es negativo", () => {
    const presupuesto: Presupuesto = { total: 50000, origen: "total", porCategoria: [] };

    expect(calcularPanel(viaje, gastos, presupuesto, "2026-10-14").presupuesto?.restante).toBe(-3000);
  });
});
