import { describe, expect, it } from "vitest";
import { ErrorValidacion } from "@/errores";
import { leerCuerpoJson } from "./leerCuerpoJson";

function pedido(cuerpo: string, tipoContenido?: string) {
  const headers = tipoContenido ? { "content-type": tipoContenido } : undefined;
  return new Request("http://localhost/api/prueba", { method: "POST", body: cuerpo, headers });
}

describe("leerCuerpoJson", () => {
  it("devuelve el cuerpo parseado", async () => {
    await expect(leerCuerpoJson(pedido('{"email":"a@b.com"}', "application/json"))).resolves.toEqual({
      email: "a@b.com",
    });
  });

  it("acepta el content-type con charset", async () => {
    await expect(leerCuerpoJson(pedido("{}", "application/json; charset=utf-8"))).resolves.toEqual({});
  });

  it("lanza ErrorValidacion si el JSON está mal formado", async () => {
    await expect(leerCuerpoJson(pedido("{email:", "application/json"))).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it.each([undefined, "text/plain", "application/x-www-form-urlencoded"])(
    "rechaza el content-type %s aunque el cuerpo sea JSON válido",
    async (tipoContenido) => {
      await expect(leerCuerpoJson(pedido("{}", tipoContenido))).rejects.toBeInstanceOf(ErrorValidacion);
    },
  );
});
