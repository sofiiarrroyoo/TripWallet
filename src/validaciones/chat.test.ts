import { describe, expect, it } from "vitest";
import { MAXIMO_CARACTERES_MENSAJE, esquemaPedidoChat } from "./chat";

const ZONA = "America/Argentina/Buenos_Aires";

function mensajesDeError(datos: unknown): string[] {
  const resultado = esquemaPedidoChat.safeParse(datos);
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
}

describe("esquemaPedidoChat", () => {
  it("acepta un mensaje nuevo y le recorta los espacios", () => {
    const pedido = esquemaPedidoChat.parse({ accion: "enviar", texto: "  hola  ", zonaHoraria: ZONA });

    expect(pedido).toEqual({ accion: "enviar", texto: "hola", zonaHoraria: ZONA });
  });

  it("acepta un reintento sin texto", () => {
    expect(esquemaPedidoChat.parse({ accion: "reintentar", zonaHoraria: ZONA })).toEqual({
      accion: "reintentar",
      zonaHoraria: ZONA,
    });
  });

  it("acepta un mensaje justo en el límite y rechaza uno que lo pasa", () => {
    const enElLimite = { accion: "enviar", texto: "a".repeat(MAXIMO_CARACTERES_MENSAJE), zonaHoraria: ZONA };

    expect(mensajesDeError(enElLimite)).toEqual([]);
    expect(mensajesDeError({ ...enElLimite, texto: enElLimite.texto + "a" })).toEqual([
      "El mensaje puede tener hasta 1000 caracteres.",
    ]);
  });

  it.each(["", "   ", "\n\t"])("rechaza un mensaje vacío (%j)", (texto) => {
    expect(mensajesDeError({ accion: "enviar", texto, zonaHoraria: ZONA })).toEqual(["Escribí un mensaje."]);
  });

  it("rechaza un texto que no es string", () => {
    expect(mensajesDeError({ accion: "enviar", texto: 42, zonaHoraria: ZONA })).toEqual(["Escribí un mensaje."]);
  });

  it.each([undefined, "Mordor/Montaña", ""])("rechaza la zona horaria %j", (zonaHoraria) => {
    expect(mensajesDeError({ accion: "reintentar", zonaHoraria })).toHaveLength(1);
  });

  it("rechaza una acción desconocida", () => {
    expect(esquemaPedidoChat.safeParse({ accion: "borrar", zonaHoraria: ZONA }).success).toBe(false);
  });
});
