import { describe, expect, it } from "vitest";
import type { Categoria } from "@/tipos/categoria";
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

const categorias: Categoria[] = [
  { id: "c-1", nombre: "Comida y bebida", esPorDefecto: true },
  { id: "c-2", nombre: "Transporte", esPorDefecto: true },
  { id: "c-3", nombre: "Souvenirs", esPorDefecto: false },
];

// 01:30 UTC del 15/10: en Buenos Aires (UTC-3) todavía es 14/10 y en Tokio (UTC+9) ya es 15/10.
const AHORA = new Date("2026-10-15T01:30:00Z");

function prompt(cambios: Partial<Viaje> = {}, zonaHoraria = "America/Argentina/Buenos_Aires") {
  return construirPromptSistema({ viaje: { ...viaje, ...cambios }, categorias, ahora: AHORA, zonaHoraria });
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

  it("lista las categorías disponibles, las por defecto y las propias", () => {
    expect(prompt()).toContain("Categorías de gastos disponibles: Comida y bebida, Transporte, Souvenirs");
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

  describe("reglas para registrar gastos", () => {
    it("le enseña a leer montos en jerga argentina", () => {
      const texto = prompt();

      expect(texto).toMatch(/"15 lucas" = 15000/);
      expect(texto).toMatch(/"2k" = 2000/);
      expect(texto).toMatch(/"un palo" es un millón/);
    });

    it("le indica preguntar con pedir_datos cuando la moneda es ambigua", () => {
      expect(prompt()).toMatch(/"Pesos" a secas es ambiguo.*pedir_datos/);
    });

    it("exige que la persona acepte antes de crear una categoría", () => {
      expect(prompt()).toMatch(/Llamá a crear_categoria solo después de que la persona acepte/);
    });

    it("le indica no afirmar que hizo algo si la tool falló", () => {
      expect(prompt()).toMatch(/ok: false, no digas que lo hiciste/);
    });

    it("incluye ejemplos de cómo interpretar un gasto", () => {
      const texto = prompt();

      expect(texto).toMatch(/pagué 15 lucas chilenas la cena.*monto 15000, moneda CLP/);
      expect(texto).toMatch(/taxi 8k.*monto 8000, moneda ARS/);
      expect(texto).toMatch(/gasté 5 mil pesos en la farmacia.*pedir_datos/);
    });
  });

  describe("reglas sobre números", () => {
    it("le prohíbe calcular o inventar los números del viaje y le indica usar convertir_moneda", () => {
      const texto = prompt();

      expect(texto).toMatch(/nunca los calcules ni los inventes/);
      expect(texto).toMatch(/ni inventes cotizaciones/);
      expect(texto).toMatch(/usá convertir_moneda y citá la cotización, su fuente y su fecha/);
    });

    it("le permite dar precios orientativos de un lugar, aclarando que son una estimación", () => {
      expect(prompt()).toMatch(/precios orientativos de un lugar.*rango aproximado.*estimación/);
    });

    it("aclara lo que todavía no puede hacer y que no prometa recordar nada", () => {
      const texto = prompt();

      expect(texto).toMatch(/Todavía no podés consultar lo gastado ni cerrar el viaje/);
      expect(texto).toMatch(/No prometas recordar ni anotar nada por tu cuenta/);
    });
  });
});
