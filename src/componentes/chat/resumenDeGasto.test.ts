import { describe, expect, it } from "vitest";
import type { GastoRegistrado } from "@/tipos/gasto";
import { resumenDeGasto } from "./resumenDeGasto";

const gasto: GastoRegistrado = {
  id: "g-1",
  descripcion: "Cena",
  categoria: "Comida y bebida",
  fechaGasto: "2026-10-14",
  montoOriginal: 15000,
  monedaOriginal: "CLP",
  montoConvertido: 21750,
  monedaBase: "ARS",
  cotizacion: 1.45,
  fechaCotizacion: "2026-10-13",
  fuente: "ExchangeRate-API (open.er-api.com)",
  aviso: null,
};

// Intl usa espacios especiales (no separables) que no importan para estos tests.
const sinEspaciosEspeciales = (texto: string | null) => texto?.replace(/\s/g, " ") ?? null;

describe("resumenDeGasto", () => {
  it("muestra el monto convertido, el original, la cotización con su fecha y la fuente", () => {
    const resumen = resumenDeGasto(gasto);

    expect(resumen.titulo).toBe("Cena");
    expect(resumen.detalle).toBe("Comida y bebida · 14 de oct de 2026");
    expect(sinEspaciosEspeciales(resumen.montoPrincipal)).toBe("ARS 21.750,00");
    expect(sinEspaciosEspeciales(resumen.montoOriginal)).toBe("CLP 15.000");
    expect(resumen.cotizacion).toBe("1 CLP = 1,45 ARS · cotización del 13 de oct de 2026");
    expect(resumen.fuente).toBe("ExchangeRate-API (open.er-api.com)");
    expect(resumen.aviso).toBeNull();
  });

  it("no muestra conversión cuando el gasto es en la moneda del viaje", () => {
    const resumen = resumenDeGasto({
      ...gasto,
      monedaOriginal: "ARS",
      montoOriginal: 2000,
      montoConvertido: 2000,
      cotizacion: 1,
      fuente: null,
    });

    expect(resumen).toMatchObject({ montoOriginal: null, cotizacion: null, fuente: null });
    expect(sinEspaciosEspeciales(resumen.montoPrincipal)).toBe("ARS 2.000,00");
  });

  it("pasa el aviso de la cotización desactualizada", () => {
    const resumen = resumenDeGasto({ ...gasto, aviso: "Usé la cotización del 13 oct 2026." });

    expect(resumen.aviso).toBe("Usé la cotización del 13 oct 2026.");
  });
});
