import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { Mensaje } from "@/tipos/mensaje";
import { aMensajeUI, textoDe, textoVisible } from "./mensajesUI";

const mensaje: Mensaje = {
  id: "m-1",
  viajeId: "viaje-1",
  rol: "assistant",
  contenido: "Hola!",
  llamadasTools: [],
  tokensEntrada: 10,
  tokensSalida: 2,
  modelo: "modelo",
  creadoEn: "2026-10-14T12:00:00Z",
};

const pregunta = { pregunta: "¿En qué pesos pagaste?", opciones: ["Argentinos", "Chilenos"] };

function parteDePregunta(input: unknown) {
  return { type: "tool-pedir_datos", toolCallId: "t1", state: "output-available", input, output: { ok: true } };
}

describe("aMensajeUI", () => {
  it("conserva el id y el rol y arma una parte de texto", () => {
    expect(aMensajeUI(mensaje)).toEqual({ id: "m-1", role: "assistant", parts: [{ type: "text", text: "Hola!" }] });
  });

  it("vuelve a armar las tools guardadas como partes ya resueltas, antes del texto", () => {
    const ui = aMensajeUI({
      ...mensaje,
      llamadasTools: [{ nombre: "registrar_gasto", argumentos: { monto: 15000 }, resultado: { ok: true } }],
    });

    expect(ui.parts).toEqual([
      {
        type: "tool-registrar_gasto",
        toolCallId: "m-1-0",
        state: "output-available",
        input: { monto: 15000 },
        output: { ok: true },
      },
      { type: "text", text: "Hola!" },
    ]);
  });

  it("no agrega una parte de texto vacía cuando la respuesta fue solo una tool", () => {
    const ui = aMensajeUI({
      ...mensaje,
      contenido: "",
      llamadasTools: [{ nombre: "pedir_datos", argumentos: pregunta, resultado: { ok: true } }],
    });

    expect(ui.parts).toHaveLength(1);
  });
});

describe("textoDe", () => {
  it("junta las partes de texto e ignora las demás", () => {
    const ui = {
      id: "m-2",
      role: "assistant",
      parts: [
        { type: "text", text: "Hola" },
        { type: "tool-convertir_moneda", toolCallId: "t1", state: "input-available", input: {} },
        { type: "text", text: " mundo" },
      ],
    } as UIMessage;

    expect(textoDe(ui)).toBe("Hola mundo");
  });

  it("devuelve vacío si no hay texto", () => {
    expect(textoDe({ id: "m-3", role: "assistant", parts: [] })).toBe("");
  });
});

describe("textoVisible", () => {
  it("es el texto cuando no hay preguntas", () => {
    expect(textoVisible({ id: "m-4", role: "assistant", parts: [{ type: "text", text: "Listo" }] })).toBe("Listo");
  });

  it("muestra la pregunta con sus opciones cuando la respuesta fue solo eso", () => {
    const ui = { id: "m-5", role: "assistant", parts: [parteDePregunta(pregunta)] } as UIMessage;

    expect(textoVisible(ui)).toBe("¿En qué pesos pagaste?\nOpciones: Argentinos / Chilenos");
  });

  it("junta el texto y la pregunta si hay ambos", () => {
    const ui = {
      id: "m-6",
      role: "assistant",
      parts: [parteDePregunta(pregunta), { type: "text", text: "Necesito un dato." }],
    } as UIMessage;

    expect(textoVisible(ui)).toBe("Necesito un dato.\n\n¿En qué pesos pagaste?\nOpciones: Argentinos / Chilenos");
  });

  it("ignora una pregunta mal formada en lugar de romper", () => {
    const ui = { id: "m-7", role: "assistant", parts: [parteDePregunta({ pregunta: "¿?" })] } as UIMessage;

    expect(textoVisible(ui)).toBe("");
  });
});
