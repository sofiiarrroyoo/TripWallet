import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { Mensaje } from "@/tipos/mensaje";
import { aMensajeUI, textoDe } from "./mensajesUI";

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

describe("aMensajeUI", () => {
  it("conserva el id y el rol y arma una parte de texto", () => {
    expect(aMensajeUI(mensaje)).toEqual({ id: "m-1", role: "assistant", parts: [{ type: "text", text: "Hola!" }] });
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
