import { describe, expect, it } from "vitest";
import { mensajeDeError } from "./mensajeDeError";

describe("mensajeDeError", () => {
  it("muestra el mensaje de la API cuando viene en nuestro formato", () => {
    const cuerpo = JSON.stringify({
      error: { codigo: "LIMITE_EXCEDIDO", mensaje: "Llegaste al límite de mensajes por hora." },
    });

    expect(mensajeDeError(new Error(cuerpo))).toBe("Llegaste al límite de mensajes por hora.");
  });

  it("explica un problema de conexión", () => {
    expect(mensajeDeError(new TypeError("Failed to fetch"))).toMatch(/conectarnos/);
  });

  it.each([
    new Error("El asistente no pudo responder."),
    new Error("<html>Bad Gateway</html>"),
    "algo raro",
    undefined,
  ])("usa un mensaje genérico para %j", (error) => {
    expect(mensajeDeError(error)).toBe("El asistente no pudo responder. Probá de nuevo.");
  });
});
