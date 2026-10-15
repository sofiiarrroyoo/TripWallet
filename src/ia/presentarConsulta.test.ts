import { describe, expect, it } from "vitest";
import type { ConsultaGastos } from "@/tipos/resumen";
import { presentarConsulta } from "./presentarConsulta";

const FUENTE = "ExchangeRate-API (open.er-api.com)";

const consulta: ConsultaGastos = {
  monedaBase: "ARS",
  filtro: { categoria: null, desde: null, hasta: null },
  resumen: {
    total: 36750,
    cantidad: 2,
    porCategoria: [
      { categoria: "Comida y bebida", total: 21750, cantidad: 1, porcentajeDelTotal: 59.2 },
      { categoria: "Transporte", total: 15000, cantidad: 1, porcentajeDelTotal: 40.8 },
    ],
    porDia: [{ fecha: "2026-10-14", total: 36750, cantidad: 2 }],
  },
  gastos: [
    {
      id: "g-1",
      descripcion: "Cena",
      categoria: "Comida y bebida",
      fechaGasto: "2026-10-14",
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      cotizacion: 1.45,
      fechaCotizacion: "2026-10-14",
      creadoEn: "2026-10-14T21:00:00Z",
    },
    {
      id: "g-2",
      descripcion: "Taxi",
      categoria: "Transporte",
      fechaGasto: "2026-10-14",
      montoOriginal: 15000,
      monedaOriginal: "ARS",
      montoConvertido: 15000,
      cotizacion: 1,
      fechaCotizacion: "2026-10-14",
      creadoEn: "2026-10-14T20:00:00Z",
    },
  ],
  hayMasGastos: false,
  presupuesto: null,
  fuenteCotizaciones: FUENTE,
};

// Intl usa espacios especiales (no separables) que no importan para estos tests.
const limpiar = (valor: unknown): unknown => JSON.parse(JSON.stringify(valor).replace(/[  ]/g, " "));

describe("presentarConsulta", () => {
  it("escribe los montos ya formateados, con la moneda, para que el modelo los copie", () => {
    const presentada = limpiar(presentarConsulta(consulta)) as ReturnType<typeof presentarConsulta>;

    expect(presentada.total).toBe("ARS 36.750,00");
    expect(presentada.porCategoria[0]).toEqual({
      categoria: "Comida y bebida",
      total: "ARS 21.750,00",
      cantidad: 1,
      porcentajeDelTotal: 59.2,
    });
    expect(presentada.porDia).toEqual([{ fecha: "2026-10-14", total: "ARS 36.750,00", cantidad: 2 }]);
  });

  it("en un gasto en otra moneda muestra el monto original y la cotización usada con su fecha", () => {
    const [cena, taxi] = (limpiar(presentarConsulta(consulta)) as ReturnType<typeof presentarConsulta>).gastos;

    expect(cena).toEqual({
      descripcion: "Cena",
      categoria: "Comida y bebida",
      fecha: "2026-10-14",
      monto: "ARS 21.750,00",
      montoOriginal: "CLP 15.000",
      cotizacion: "1 CLP = 1,45 ARS",
      fechaCotizacion: "2026-10-14",
    });
    expect(taxi).toMatchObject({ montoOriginal: null, cotizacion: null, fechaCotizacion: null });
  });

  it("incluye la fuente de las cotizaciones", () => {
    expect(presentarConsulta(consulta).fuenteCotizaciones).toBe(FUENTE);
  });

  it("deja el filtro aplicado para que el modelo sepa de qué es la respuesta", () => {
    const filtrada = presentarConsulta({
      ...consulta,
      filtro: { categoria: "Transporte", desde: "2026-10-14", hasta: "2026-10-14" },
    });

    expect(filtrada.filtro).toEqual({ categoria: "Transporte", desde: "2026-10-14", hasta: "2026-10-14" });
  });

  describe("sin gastos", () => {
    it("lo marca para que el modelo no invente nada", () => {
      const vacia = presentarConsulta({
        ...consulta,
        resumen: { total: 0, cantidad: 0, porCategoria: [], porDia: [] },
        gastos: [],
      });

      expect(vacia).toMatchObject({ sinGastos: true, cantidadDeGastos: 0, gastos: [], porCategoria: [] });
      expect(limpiar(vacia)).toMatchObject({ total: "ARS 0,00" });
    });

    it("no está marcada cuando hay gastos", () => {
      expect(presentarConsulta(consulta).sinGastos).toBe(false);
    });
  });

  describe("detalle incompleto", () => {
    it("avisa cuántos gastos se listan de cuántos hay, y que los totales incluyen todos", () => {
      const larga = presentarConsulta({
        ...consulta,
        resumen: { ...consulta.resumen, cantidad: 80 },
        hayMasGastos: true,
      });

      expect(larga.detalleIncompleto).toBe(
        "Se listan solo los 2 gastos más recientes de 80; los totales incluyen todos.",
      );
    });

    it("es null si se listan todos", () => {
      expect(presentarConsulta(consulta).detalleIncompleto).toBeNull();
    });
  });

  describe("presupuesto", () => {
    it("es null si el viaje no tiene presupuesto", () => {
      expect(presentarConsulta(consulta).presupuesto).toBeNull();
    });

    it("muestra cuánto se gastó, cuánto queda y el porcentaje, en total y por categoría", () => {
      const conPresupuesto = presentarConsulta({
        ...consulta,
        presupuesto: {
          total: 50000,
          gastado: 36750,
          restante: 13250,
          porcentajeGastado: 73.5,
          porCategoria: [
            { categoria: "Comida y bebida", presupuesto: 30000, gastado: 21750, restante: 8250, porcentajeGastado: 72.5 },
          ],
        },
      });

      expect(limpiar(conPresupuesto.presupuesto)).toEqual({
        total: "ARS 50.000,00",
        gastado: "ARS 36.750,00",
        restante: "ARS 13.250,00",
        porcentajeGastado: 73.5,
        seExcedio: false,
        porCategoria: [
          {
            categoria: "Comida y bebida",
            presupuesto: "ARS 30.000,00",
            gastado: "ARS 21.750,00",
            restante: "ARS 8.250,00",
            porcentajeGastado: 72.5,
            seExcedio: false,
          },
        ],
      });
    });

    it("marca cuando se pasó del presupuesto, en total y por categoría", () => {
      const excedido = presentarConsulta({
        ...consulta,
        presupuesto: {
          total: 30000,
          gastado: 36750,
          restante: -6750,
          porcentajeGastado: 122.5,
          porCategoria: [
            { categoria: "Transporte", presupuesto: 10000, gastado: 15000, restante: -5000, porcentajeGastado: 150 },
          ],
        },
      });

      expect(excedido.presupuesto).toMatchObject({ seExcedio: true, porcentajeGastado: 122.5 });
      expect(excedido.presupuesto?.porCategoria[0]).toMatchObject({ seExcedio: true, porcentajeGastado: 150 });
      expect((limpiar(excedido.presupuesto) as { restante: string }).restante).toBe("-ARS 6.750,00");
    });
  });
});
