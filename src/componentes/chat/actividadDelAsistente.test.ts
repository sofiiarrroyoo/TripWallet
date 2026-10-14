import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { ETIQUETA_ESCRIBIENDO, actividadDelAsistente, etiquetaTool } from "./actividadDelAsistente";

function asistente(parts: unknown[]): UIMessage {
  return { id: "a-1", role: "assistant", parts } as UIMessage;
}

const texto = (text: string) => ({ type: "text", text });
const tool = (nombre: string, state: string) => ({ type: `tool-${nombre}`, toolCallId: "t1", state, input: {} });

describe("etiquetaTool", () => {
  it("tiene una etiqueta para cada tool del bot", () => {
    expect(etiquetaTool("convertir_moneda")).toBe("Consultando cotización…");
    expect(etiquetaTool("consultar_gastos")).toBe("Consultando tus gastos…");
  });

  it("usa una etiqueta genérica para una tool que no conoce", () => {
    expect(etiquetaTool("tool_nueva")).toBe("Trabajando en tu pedido…");
  });
});

describe("actividadDelAsistente", () => {
  it("muestra 'Escribiendo…' mientras espera el primer fragmento", () => {
    expect(actividadDelAsistente("submitted", undefined)).toBe(ETIQUETA_ESCRIBIENDO);
  });

  it("muestra la etiqueta de la tool que está corriendo", () => {
    const mensaje = asistente([tool("convertir_moneda", "input-available")]);

    expect(actividadDelAsistente("streaming", mensaje)).toBe("Consultando cotización…");
  });

  it("deja de mostrarla cuando la tool terminó y ya llega el texto", () => {
    const mensaje = asistente([tool("convertir_moneda", "output-available"), texto("Son 21.750 pesos")]);

    expect(actividadDelAsistente("streaming", mensaje)).toBeNull();
  });

  it("sigue mostrando 'Escribiendo…' si la respuesta todavía no tiene texto", () => {
    expect(actividadDelAsistente("streaming", asistente([]))).toBe(ETIQUETA_ESCRIBIENDO);
  });

  it("no muestra nada mientras el texto está llegando", () => {
    expect(actividadDelAsistente("streaming", asistente([texto("Hola")]))).toBeNull();
  });

  it("no muestra nada si no hay nada en curso", () => {
    expect(actividadDelAsistente("ready", asistente([tool("convertir_moneda", "input-available")]))).toBeNull();
    expect(actividadDelAsistente("error", undefined)).toBeNull();
  });

  it("no confunde el último mensaje del usuario con una respuesta en curso", () => {
    const delUsuario: UIMessage = { id: "u-1", role: "user", parts: [{ type: "text", text: "hola" }] };

    expect(actividadDelAsistente("streaming", delUsuario)).toBeNull();
  });
});
