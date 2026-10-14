import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { llamarApi, sinDatos } from "./llamarApi";

function simularFetch(respuesta: Response | Error) {
  const fetchFalso = vi.fn(async () => {
    if (respuesta instanceof Error) throw respuesta;
    return respuesta;
  });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

const esquemaUsuario = z.object({ usuario: z.object({ email: z.string() }) });

describe("llamarApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("devuelve los datos validados si la respuesta es exitosa", async () => {
    simularFetch(Response.json({ usuario: { email: "a@b.com" } }));

    await expect(llamarApi("/api/prueba", esquemaUsuario)).resolves.toEqual({
      ok: true,
      datos: { usuario: { email: "a@b.com" } },
    });
  });

  it("manda el cuerpo como JSON con su content-type", async () => {
    const fetchFalso = simularFetch(Response.json({}));

    await llamarApi("/api/prueba", sinDatos, { metodo: "POST", cuerpo: { email: "a@b.com" } });

    expect(fetchFalso).toHaveBeenCalledWith("/api/prueba", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"email":"a@b.com"}',
    });
  });

  it("no manda content-type si no hay cuerpo", async () => {
    const fetchFalso = simularFetch(new Response(null, { status: 204 }));

    await llamarApi("/api/prueba", sinDatos, { metodo: "DELETE" });

    expect(fetchFalso).toHaveBeenCalledWith("/api/prueba", {
      method: "DELETE",
      headers: undefined,
      body: undefined,
    });
  });

  it("acepta un 204 sin cuerpo cuando no se esperan datos", async () => {
    simularFetch(new Response(null, { status: 204 }));

    await expect(llamarApi("/api/prueba", sinDatos)).resolves.toEqual({ ok: true, datos: null });
  });

  it("devuelve el error de la API con sus detalles", async () => {
    const error = {
      codigo: "VALIDACION",
      mensaje: "Los datos enviados no son válidos.",
      detalles: [{ campo: "email", mensaje: "Ingresá un email válido." }],
    };
    simularFetch(Response.json({ error }, { status: 400 }));

    await expect(llamarApi("/api/prueba", sinDatos)).resolves.toEqual({ ok: false, error });
  });

  it("devuelve un error genérico si la respuesta de error no tiene el formato de la API", async () => {
    simularFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    const resultado = await llamarApi("/api/prueba", sinDatos);

    expect(resultado).toMatchObject({ ok: false, error: { codigo: "ERROR_INTERNO" } });
  });

  it("devuelve un error de red si fetch falla", async () => {
    simularFetch(new TypeError("Failed to fetch"));

    const resultado = await llamarApi("/api/prueba", sinDatos);

    expect(resultado).toMatchObject({ ok: false, error: { codigo: "ERROR_RED" } });
  });

  it("devuelve un error genérico si una respuesta exitosa no cumple el esquema", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    simularFetch(Response.json({ otraCosa: true }));

    const resultado = await llamarApi("/api/prueba", esquemaUsuario);

    expect(resultado).toMatchObject({ ok: false, error: { codigo: "ERROR_INTERNO" } });
  });
});
