import { describe, expect, it } from "vitest";
import { fechaIsoEn } from "./fechas";

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
