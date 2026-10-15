import { describe, expect, it } from "vitest";
import type { EstadisticasViaje, FotoCotizaciones } from "@/tipos/cierre";
import { esquemaEstadisticasViaje, esquemaFotoCotizaciones } from "./resumenViaje";

const estadisticas: EstadisticasViaje = {
  monedaBase: "ARS",
  total: 53000,
  cantidadGastos: 5,
  diasDelViaje: 10,
  promedioPorDia: 5300,
  porCategoria: [{ categoria: "Comida y bebida", total: 25000, cantidad: 3, porcentajeDelTotal: 47.2 }],
  gastosMasGrandes: [
    {
      id: "g-1",
      descripcion: "Cena",
      categoria: "Comida y bebida",
      fechaGasto: "2026-10-12",
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
    },
  ],
  presupuesto: {
    total: 100000,
    gastado: 53000,
    restante: 47000,
    porcentajeGastado: 53,
    porCategoria: [
      { categoria: "Comida y bebida", presupuesto: 30000, gastado: 25000, restante: 5000, porcentajeGastado: 83.3 },
    ],
  },
};

const foto: FotoCotizaciones = {
  monedaBase: "USD",
  fecha: "2026-10-14",
  fuente: "ExchangeRate-API (open.er-api.com)",
  tasas: { ARS: 1450, CLP: 950 },
  desactualizada: false,
};

describe("esquemaEstadisticasViaje", () => {
  it("lee las estadísticas tal como se guardan", () => {
    expect(esquemaEstadisticasViaje.parse(estadisticas)).toEqual(estadisticas);
  });

  it("acepta un viaje sin presupuesto", () => {
    expect(esquemaEstadisticasViaje.parse({ ...estadisticas, presupuesto: null }).presupuesto).toBeNull();
  });

  it("rechaza un JSON al que le falta un campo", () => {
    const incompleto: Partial<EstadisticasViaje> = { ...estadisticas };
    delete incompleto.total;

    expect(esquemaEstadisticasViaje.safeParse(incompleto).success).toBe(false);
  });

  it("rechaza un campo con el tipo equivocado", () => {
    expect(esquemaEstadisticasViaje.safeParse({ ...estadisticas, total: "mucho" }).success).toBe(false);
  });
});

describe("esquemaFotoCotizaciones", () => {
  it("lee la foto tal como se guarda", () => {
    expect(esquemaFotoCotizaciones.parse(foto)).toEqual(foto);
  });

  it("rechaza tasas que no son positivas o con códigos mal formados", () => {
    expect(esquemaFotoCotizaciones.safeParse({ ...foto, tasas: { ARS: 0 } }).success).toBe(false);
    expect(esquemaFotoCotizaciones.safeParse({ ...foto, tasas: { ars: 1 } }).success).toBe(false);
  });
});
