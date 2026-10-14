import { describe, expect, it } from "vitest";
import type { Viaje } from "@/tipos/viaje";
import { construirPromptSistema } from "./promptSistema";

const viaje: Viaje = {
  id: "viaje-1",
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-10",
  presupuestoTotal: 1500000,
  estado: "abierto",
  creadoEn: "2026-10-14T12:00:00Z",
};

// 01:30 UTC del 15/10: en Buenos Aires (UTC-3) todavía es 14/10 y en Tokio (UTC+9) ya es 15/10.
const AHORA = new Date("2026-10-15T01:30:00Z");

function prompt(cambios: Partial<Viaje> = {}, zonaHoraria = "America/Argentina/Buenos_Aires") {
  return construirPromptSistema({ viaje: { ...viaje, ...cambios }, ahora: AHORA, zonaHoraria });
}

describe("construirPromptSistema", () => {
  it("incluye los datos del viaje", () => {
    const texto = prompt();

    expect(texto).toContain("Nombre: Vacaciones en Chile");
    expect(texto).toContain("Destino: Santiago");
    expect(texto).toContain("Moneda base: ARS");
    expect(texto).toContain("Estado: abierto");
  });

  it("muestra el presupuesto formateado por el código, no por el modelo", () => {
    expect(prompt().replace(/\s/g, " ")).toContain("Presupuesto total: ARS 1.500.000,00");
  });

  it("aclara cuando no hay presupuesto", () => {
    expect(prompt({ presupuestoTotal: null })).toContain("Presupuesto total: sin presupuesto cargado");
  });

  it("avisa que un viaje cerrado solo se puede consultar", () => {
    expect(prompt({ estado: "cerrado" })).toContain("cerrado (solo se puede consultar)");
  });

  it.each([
    ["America/Argentina/Buenos_Aires", "2026-10-14", "miércoles"],
    ["Asia/Tokyo", "2026-10-15", "jueves"],
  ])("calcula la fecha de hoy en la zona horaria %s", (zonaHoraria, iso, diaSemana) => {
    const texto = prompt({}, zonaHoraria);

    expect(texto).toContain(`(${iso})`);
    expect(texto).toContain(diaSemana);
    expect(texto).toContain(`zona horaria ${zonaHoraria}`);
  });

  it("le pide texto plano porque la interfaz no renderiza Markdown", () => {
    expect(prompt()).toMatch(/texto plano, sin Markdown/);
  });

  it("le prohíbe calcular o inventar los números del viaje", () => {
    const texto = prompt();

    expect(texto).toMatch(/nunca los calcules ni los inventes/);
    expect(texto).toMatch(/ni inventes cotizaciones/);
  });

  it("le permite dar precios orientativos de un lugar, aclarando que son una estimación", () => {
    expect(prompt()).toMatch(/precios orientativos de un lugar.*rango aproximado.*estimación/);
  });

  it("aclara que todavía no guarda datos y que no prometa recordar nada", () => {
    const texto = prompt();

    expect(texto).toMatch(/Todavía no podés guardar datos desde el chat/);
    expect(texto).toMatch(/No prometas recordar ni anotar nada/);
  });
});
