import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { depuracionDe, textoJson } from "./depuracion";

function asistente(parts: unknown[], metadata?: unknown): UIMessage {
  return { id: "a-1", role: "assistant", parts, metadata } as UIMessage;
}

const gastoRegistrado = {
  type: "tool-registrar_gasto",
  toolCallId: "t1",
  state: "output-available",
  input: { monto: 15000, moneda: "CLP" },
  output: { ok: true, gasto: { id: "g-1" } },
};

describe("depuracionDe", () => {
  it("lista las tools llamadas con sus parámetros y su resultado, en orden", () => {
    const ui = asistente([
      { type: "tool-convertir_moneda", toolCallId: "t0", state: "output-available", input: { monto: 1 }, output: { ok: true } },
      gastoRegistrado,
      { type: "text", text: "Listo" },
    ]);

    expect(depuracionDe(ui).llamadas).toEqual([
      { id: "t0", nombre: "convertir_moneda", estado: "completada", argumentos: { monto: 1 }, resultado: { ok: true } },
      {
        id: "t1",
        nombre: "registrar_gasto",
        estado: "completada",
        argumentos: { monto: 15000, moneda: "CLP" },
        resultado: { ok: true, gasto: { id: "g-1" } },
      },
    ]);
  });

  it("una respuesta sin tools tiene una lista vacía", () => {
    expect(depuracionDe(asistente([{ type: "text", text: "Hola" }])).llamadas).toEqual([]);
  });

  it("muestra una tool que falló con el texto del error", () => {
    const ui = asistente([
      { type: "tool-registrar_gasto", toolCallId: "t1", state: "output-error", input: { monto: 1 }, errorText: "falló" },
    ]);

    expect(depuracionDe(ui).llamadas[0]).toMatchObject({ estado: "con error", resultado: "falló" });
  });

  it("marca como en curso una tool que todavía no devolvió su resultado", () => {
    const ui = asistente([{ type: "tool-registrar_gasto", toolCallId: "t1", state: "input-available", input: {} }]);

    expect(depuracionDe(ui).llamadas[0]).toMatchObject({ estado: "en curso", resultado: undefined });
  });

  it("lee el modelo y los tokens de los metadatos y suma el total", () => {
    const ui = asistente([], { modelo: "gpt-5.4-mini", tokensEntrada: 120, tokensSalida: 30 });

    expect(depuracionDe(ui)).toMatchObject({
      modelo: "gpt-5.4-mini",
      tokensEntrada: 120,
      tokensSalida: 30,
      tokensTotales: 150,
    });
  });

  it("sin tokens (respuesta cancelada o todavía escribiéndose) no inventa un total", () => {
    const ui = asistente([], { modelo: "gpt-5.4-mini", tokensEntrada: null, tokensSalida: null });

    expect(depuracionDe(ui)).toMatchObject({ modelo: "gpt-5.4-mini", tokensEntrada: null, tokensTotales: null });
  });

  it("sin metadatos o con metadatos mal formados todo queda en null", () => {
    const vacio = { modelo: null, tokensEntrada: null, tokensSalida: null, tokensTotales: null };

    expect(depuracionDe(asistente([]))).toMatchObject(vacio);
    expect(depuracionDe(asistente([], { tokensEntrada: "mucho" }))).toMatchObject(vacio);
  });
});

describe("textoJson", () => {
  it("indenta los objetos", () => {
    expect(textoJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("deja los textos como están", () => {
    expect(textoJson("falló")).toBe("falló");
  });

  it("muestra un guion cuando no hay valor", () => {
    expect(textoJson(undefined)).toBe("—");
  });
});
