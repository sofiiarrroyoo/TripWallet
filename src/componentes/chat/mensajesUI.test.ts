import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { Mensaje } from "@/tipos/mensaje";
import {
  aMensajeUI,
  esRespuestaCalificable,
  gastosRegistradosDe,
  idsDeGastosEliminadosPorElChat,
  preguntaPendienteDe,
  textoDe,
  textoVisible,
} from "./mensajesUI";

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

const gasto = {
  id: "g-1",
  descripcion: "Cena",
  categoria: "Comida y bebida",
  fechaGasto: "2026-10-14",
  montoOriginal: 15000,
  monedaOriginal: "CLP",
  montoConvertido: 21750,
  monedaBase: "ARS",
  cotizacion: 1.45,
  fechaCotizacion: "2026-10-14",
  fuente: "ExchangeRate-API (open.er-api.com)",
  aviso: null,
};

function parteDeTool(nombre: string, input: unknown, output: unknown) {
  return { type: `tool-${nombre}`, toolCallId: "t1", state: "output-available", input, output };
}

function asistente(...parts: unknown[]): UIMessage {
  return { id: "a-1", role: "assistant", parts } as UIMessage;
}

describe("aMensajeUI", () => {
  it("conserva el id y el rol y arma una parte de texto", () => {
    expect(aMensajeUI(mensaje)).toMatchObject({ id: "m-1", role: "assistant", parts: [{ type: "text", text: "Hola!" }] });
  });

  it("agrega el modelo y los tokens de las respuestas del bot como metadatos", () => {
    expect(aMensajeUI(mensaje).metadata).toEqual({ modelo: "modelo", tokensEntrada: 10, tokensSalida: 2 });
  });

  it("deja los tokens en null si la respuesta se canceló y no los tiene", () => {
    const ui = aMensajeUI({ ...mensaje, tokensEntrada: null, tokensSalida: null });

    expect(ui.metadata).toEqual({ modelo: "modelo", tokensEntrada: null, tokensSalida: null });
  });

  it("los mensajes de la persona no llevan metadatos", () => {
    expect(aMensajeUI({ ...mensaje, rol: "user", modelo: null }).metadata).toBeUndefined();
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
    const ui = asistente(
      { type: "text", text: "Hola" },
      parteDeTool("convertir_moneda", {}, {}),
      { type: "text", text: " mundo" },
    );

    expect(textoDe(ui)).toBe("Hola mundo");
  });

  it("devuelve vacío si no hay texto", () => {
    expect(textoDe(asistente())).toBe("");
  });
});

describe("preguntaPendienteDe", () => {
  it("devuelve la pregunta con sus opciones", () => {
    expect(preguntaPendienteDe(asistente(parteDeTool("pedir_datos", pregunta, { ok: true })))).toEqual(pregunta);
  });

  it.each([
    [asistente({ type: "text", text: "Hola" })],
    [asistente(parteDeTool("pedir_datos", { pregunta: "¿?" }, { ok: true }))],
    [asistente(parteDeTool("pedir_datos", { pregunta: "¿?", opciones: ["una sola"] }, { ok: true }))],
  ])("devuelve null si no hay pregunta o está mal formada (%#)", (ui) => {
    expect(preguntaPendienteDe(ui)).toBeNull();
  });
});

describe("gastosRegistradosDe", () => {
  it("devuelve los gastos registrados por el mensaje", () => {
    const ui = asistente(parteDeTool("registrar_gasto", {}, { ok: true, gasto }), { type: "text", text: "Listo" });

    expect(gastosRegistradosDe(ui)).toEqual([gasto]);
  });

  it("ignora los registros que fallaron, las otras tools y las partes mal formadas", () => {
    const ui = asistente(
      parteDeTool("registrar_gasto", {}, { ok: false, codigo: "VIAJE_CERRADO", mensaje: "cerrado" }),
      parteDeTool("convertir_moneda", {}, { ok: true, gasto }),
      parteDeTool("registrar_gasto", {}, { ok: true, gasto: { id: "g-2" } }),
      { type: "tool-registrar_gasto", toolCallId: "t2", state: "input-available", input: {} },
    );

    expect(gastosRegistradosDe(ui)).toEqual([]);
  });
});

describe("idsDeGastosEliminadosPorElChat", () => {
  it("junta los ids de los gastos que borró el bot en cualquier mensaje", () => {
    const mensajes = [
      asistente(parteDeTool("eliminar_gasto", {}, { ok: true, gasto: { id: "g-1", descripcion: "Cena" } })),
      asistente(parteDeTool("eliminar_gasto", {}, { ok: false, codigo: "GASTO_NO_ENCONTRADO" })),
      asistente(parteDeTool("eliminar_gasto", {}, { ok: true, gasto: { id: "g-3" } })),
    ];

    expect(idsDeGastosEliminadosPorElChat(mensajes)).toEqual(["g-1", "g-3"]);
  });
});

describe("textoVisible", () => {
  it("es el texto cuando no hay preguntas", () => {
    expect(textoVisible(asistente({ type: "text", text: "Listo" }))).toBe("Listo");
  });

  it("muestra solo la pregunta cuando la respuesta fue una pregunta: las opciones son botones aparte", () => {
    expect(textoVisible(asistente(parteDeTool("pedir_datos", pregunta, { ok: true })))).toBe("¿En qué pesos pagaste?");
  });

  it("junta el texto y la pregunta si hay ambos", () => {
    const ui = asistente(parteDeTool("pedir_datos", pregunta, { ok: true }), { type: "text", text: "Necesito un dato." });

    expect(textoVisible(ui)).toBe("Necesito un dato.\n\n¿En qué pesos pagaste?");
  });

  it("es vacío si la respuesta fue solo una tarjeta", () => {
    expect(textoVisible(asistente(parteDeTool("registrar_gasto", {}, { ok: true, gasto })))).toBe("");
  });
});

describe("esRespuestaCalificable", () => {
  it("una respuesta con texto se puede calificar", () => {
    expect(esRespuestaCalificable(asistente({ type: "text", text: "Listo" }))).toBe(true);
  });

  it("una respuesta que solo mostró una tarjeta de gasto se puede calificar", () => {
    expect(esRespuestaCalificable(asistente(parteDeTool("registrar_gasto", {}, { ok: true, gasto })))).toBe(true);
  });

  it("una pregunta con opciones, sola, no se califica", () => {
    expect(esRespuestaCalificable(asistente(parteDeTool("pedir_datos", pregunta, { ok: true })))).toBe(false);
  });

  it("una pregunta con texto sí se puede calificar", () => {
    const ui = asistente(parteDeTool("pedir_datos", pregunta, { ok: true }), { type: "text", text: "Antes de seguir:" });

    expect(esRespuestaCalificable(ui)).toBe(true);
  });

  it("un mensaje de la persona no se califica", () => {
    const ui = { id: "u-1", role: "user", parts: [{ type: "text", text: "hola" }] } as UIMessage;

    expect(esRespuestaCalificable(ui)).toBe(false);
  });

  it("una respuesta vacía no se califica", () => {
    expect(esRespuestaCalificable(asistente())).toBe(false);
  });
});
