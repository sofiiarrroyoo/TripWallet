import { describe, expect, it } from "vitest";
import type { EstadisticasViaje } from "@/tipos/cierre";
import type { Viaje } from "@/tipos/viaje";
import { esquemaResumenCierre } from "@/validaciones/resumenCierre";
import { INSTRUCCIONES_RESUMEN, presentarCierre, presentarEstadisticas, textoDeResumen } from "./resumenCierre";

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

const estadisticas: EstadisticasViaje = {
  monedaBase: "ARS",
  total: 53000,
  cantidadGastos: 5,
  diasDelViaje: 10,
  promedioPorDia: 5300,
  porCategoria: [
    { categoria: "Comida y bebida", total: 25000, cantidad: 3, porcentajeDelTotal: 47.2 },
    { categoria: "Compras", total: 28000, cantidad: 2, porcentajeDelTotal: 52.8 },
  ],
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
    {
      id: "g-2",
      descripcion: "Taxi",
      categoria: "Transporte",
      fechaGasto: "2026-10-13",
      montoOriginal: 8000,
      monedaOriginal: "ARS",
      montoConvertido: 8000,
    },
  ],
  presupuesto: {
    total: 40000,
    gastado: 53000,
    restante: -13000,
    porcentajeGastado: 132.5,
    porCategoria: [
      { categoria: "Comida y bebida", presupuesto: 20000, gastado: 25000, restante: -5000, porcentajeGastado: 125 },
    ],
  },
};

describe("presentarEstadisticas", () => {
  const presentadas = presentarEstadisticas(viaje, estadisticas);

  it("escribe los montos ya formateados, con la moneda", () => {
    expect(presentadas.total).toBe("ARS 53.000,00");
    expect(presentadas.promedioPorDia).toBe("ARS 5.300,00");
    expect(presentadas.porCategoria[0]).toMatchObject({ categoria: "Comida y bebida", total: "ARS 25.000,00" });
  });

  it("incluye los datos del viaje", () => {
    expect(presentadas.viaje).toMatchObject({ nombre: "Vacaciones en Chile", destino: "Santiago" });
    expect(presentadas.diasDelViaje).toBe(10);
  });

  it("un gasto en otra moneda trae el monto original y la cotización usada", () => {
    expect(presentadas.gastosMasGrandes[0]).toMatchObject({
      monto: "ARS 21.750,00",
      montoOriginal: "CLP 15.000",
      cotizacion: "1 CLP = 1,45 ARS",
    });
  });

  it("un gasto en la moneda base no trae monto original ni cotización", () => {
    expect(presentadas.gastosMasGrandes[1]).toMatchObject({ montoOriginal: null, cotizacion: null });
  });

  it("marca si se excedió el presupuesto, en total y por categoría", () => {
    expect(presentadas.presupuesto).toMatchObject({ seExcedio: true, restante: "-ARS 13.000,00" });
    expect(presentadas.presupuesto?.porCategoria[0]).toMatchObject({ seExcedio: true });
  });

  it("sin presupuesto, lo deja en null", () => {
    expect(presentarEstadisticas(viaje, { ...estadisticas, presupuesto: null }).presupuesto).toBeNull();
  });
});

describe("presentarCierre", () => {
  const resumenGuardado = {
    viajeId: "viaje-1",
    estadisticas,
    cotizacionesCierre: { monedaBase: "USD", fecha: "2026-10-15", fuente: "ExchangeRate-API", tasas: { ARS: 1450 }, desactualizada: false },
    resumen: "Titular\n\n- Uno\n- Dos",
    creadoEn: "2026-10-15T12:00:00Z",
  };

  it("trae los mismos números ya formateados y el texto del resumen", () => {
    expect(presentarCierre(resumenGuardado)).toMatchObject({
      total: "ARS 53.000,00",
      cantidadDeGastos: 5,
      resumenEscrito: "Titular\n\n- Uno\n- Dos",
    });
  });

  it("deja el texto en null si el modelo no pudo generar el resumen", () => {
    expect(presentarCierre({ ...resumenGuardado, resumen: null }).resumenEscrito).toBeNull();
  });

  it("no incluye datos internos como los ids o la foto de cotizaciones", () => {
    const texto = JSON.stringify(presentarCierre(resumenGuardado));

    expect(texto).not.toContain("viaje-1");
    expect(texto).not.toContain("tasas");
  });
});

describe("textoDeResumen", () => {
  it("pone el titular y, debajo, los puntos con un guion", () => {
    expect(textoDeResumen({ titular: "Titular", puntos: ["Uno", "Dos"] })).toBe("Titular\n\n- Uno\n- Dos");
  });
});

describe("esquemaResumenCierre", () => {
  it("acepta un titular con 2 a 4 puntos", () => {
    expect(esquemaResumenCierre.safeParse({ titular: "T", puntos: ["a", "b"] }).success).toBe(true);
    expect(esquemaResumenCierre.safeParse({ titular: "T", puntos: ["a", "b", "c", "d"] }).success).toBe(true);
  });

  it.each([
    ["menos de 2 puntos", { titular: "T", puntos: ["a"] }],
    ["más de 4 puntos", { titular: "T", puntos: ["a", "b", "c", "d", "e"] }],
    ["sin titular", { puntos: ["a", "b"] }],
    ["titular vacío", { titular: "  ", puntos: ["a", "b"] }],
    ["un punto vacío", { titular: "T", puntos: ["a", ""] }],
  ])("rechaza %s", (_caso, datos) => {
    expect(esquemaResumenCierre.safeParse(datos).success).toBe(false);
  });
});

describe("INSTRUCCIONES_RESUMEN", () => {
  it("le prohíbe al modelo calcular y le pide usar solo los números del bloque", () => {
    expect(INSTRUCCIONES_RESUMEN).toContain("No sumes, no restes, no calcules");
    expect(INSTRUCCIONES_RESUMEN).toContain("SOLO los números del bloque de datos");
  });
});
