import { describe, expect, it } from "vitest";
import { diasEntre, fechaIsoEn } from "./fechas";

// 01:30 UTC del 15/10: en Buenos Aires (UTC-3) todavía es 14/10 y en Tokio (UTC+9) ya es 15/10.
const INSTANTE = new Date("2026-10-15T01:30:00Z");

describe("fechaIsoEn", () => {
  it.each([
    ["America/Argentina/Buenos_Aires", "2026-10-14"],
    ["Asia/Tokyo", "2026-10-15"],
    ["UTC", "2026-10-15"],
  ])("en %s es %s", (zonaHoraria, esperado) => {
    expect(fechaIsoEn(INSTANTE, zonaHoraria)).toBe(esperado);
  });
});

describe("diasEntre", () => {
  it("cuenta los dos extremos", () => {
    expect(diasEntre("2026-10-10", "2026-10-12")).toBe(3);
  });

  it("un viaje de un solo día tiene 1 día", () => {
    expect(diasEntre("2026-10-10", "2026-10-10")).toBe(1);
  });

  it("cruza meses y años", () => {
    expect(diasEntre("2026-12-30", "2027-01-02")).toBe(4);
  });

  it("cuenta bien en un año bisiesto", () => {
    expect(diasEntre("2028-02-28", "2028-03-01")).toBe(3);
  });

  it("nunca devuelve menos de 1, aunque las fechas vinieran al revés", () => {
    expect(diasEntre("2026-10-12", "2026-10-10")).toBe(1);
  });
});
