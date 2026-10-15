import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { obtenerModelo } from "@/integraciones/modeloLLM";
import type { EstadisticasViaje } from "@/tipos/cierre";
import type { Viaje } from "@/tipos/viaje";
import { generarResumen } from "./resumenCierre";

vi.mock("@/integraciones/modeloLLM", () => ({
  obtenerModelo: vi.fn(),
  obtenerNombreModelo: () => "modelo-de-prueba",
  AJUSTES_GENERACION: { maxOutputTokens: 100 },
}));

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
  porCategoria: [{ categoria: "Comida y bebida", total: 25000, cantidad: 3, porcentajeDelTotal: 47.2 }],
  gastosMasGrandes: [],
  presupuesto: null,
};

const uso = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

function modeloQueDevuelve(texto: string) {
  const modelo = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: texto }],
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: uso,
      warnings: [],
    }),
  });
  vi.mocked(obtenerModelo).mockReturnValue(modelo as unknown as ReturnType<typeof obtenerModelo>);
  return modelo;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("generarResumen", () => {
  it("devuelve el titular y los puntos que armó el modelo, como texto", async () => {
    modeloQueDevuelve(
      JSON.stringify({
        titular: "Gastaste ARS 53.000,00 en 10 días.",
        puntos: ["Lo que más pesó fue Comida y bebida.", "El promedio fue de ARS 5.300,00 por día."],
      }),
    );

    await expect(generarResumen(viaje, estadisticas)).resolves.toBe(
      [
        "Gastaste ARS 53.000,00 en 10 días.",
        "",
        "- Lo que más pesó fue Comida y bebida.",
        "- El promedio fue de ARS 5.300,00 por día.",
      ].join("\n"),
    );
  });

  it("le manda al modelo las estadísticas con los montos ya escritos y las reglas", async () => {
    const modelo = modeloQueDevuelve(JSON.stringify({ titular: "Listo", puntos: ["Uno", "Dos"] }));

    await generarResumen(viaje, estadisticas);

    const mensajes = JSON.stringify(modelo.doGenerateCalls[0]?.prompt);
    // Entre la moneda y el número va un espacio sin corte ( ), no uno común.
    expect(mensajes).toContain("ARS 53.000,00");
    expect(mensajes).toContain("ARS 5.300,00");
    expect(mensajes).toContain("No sumes, no restes, no calcules");
  });

  it("pide la salida en formato JSON", async () => {
    const modelo = modeloQueDevuelve(JSON.stringify({ titular: "Listo", puntos: ["Uno", "Dos"] }));

    await generarResumen(viaje, estadisticas);

    expect(modelo.doGenerateCalls[0]?.responseFormat).toMatchObject({ type: "json" });
  });

  it("devuelve null si el modelo responde algo que no cumple el esquema", async () => {
    modeloQueDevuelve(JSON.stringify({ titular: "Solo un titular, sin puntos" }));

    await expect(generarResumen(viaje, estadisticas)).resolves.toBeNull();
  });

  it("devuelve null si la respuesta no es un JSON", async () => {
    modeloQueDevuelve("Gastaste mucho.");

    await expect(generarResumen(viaje, estadisticas)).resolves.toBeNull();
  });

  it("devuelve null si el modelo falla", async () => {
    const modelo = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("OpenAI no responde");
      },
    });
    vi.mocked(obtenerModelo).mockReturnValue(modelo as unknown as ReturnType<typeof obtenerModelo>);

    await expect(generarResumen(viaje, estadisticas)).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it("devuelve null si el modelo tarda más que el límite, sin esperarlo", async () => {
    const modelo = new MockLanguageModelV4({
      doGenerate: ({ abortSignal }) =>
        new Promise((_resolver, rechazar) => {
          abortSignal?.addEventListener("abort", () => rechazar(new DOMException("Aborted", "AbortError")));
        }),
    });
    vi.mocked(obtenerModelo).mockReturnValue(modelo as unknown as ReturnType<typeof obtenerModelo>);

    await expect(generarResumen(viaje, estadisticas, 50)).resolves.toBeNull();
  });
});
