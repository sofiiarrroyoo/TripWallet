import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardarCalificacion, listarCalificaciones } from "./calificaciones";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data?: unknown; error?: unknown };

// Imita el query builder de supabase-js: cada método devuelve la misma consulta y al final se espera el resultado.
function consultaFalsa(resultado: Resultado) {
  const consulta = {
    select: vi.fn(() => consulta),
    update: vi.fn(() => consulta),
    insert: vi.fn(() => consulta),
    eq: vi.fn(() => consulta),
    in: vi.fn(() => consulta),
    then: (alResolver: (valor: Resultado) => unknown) => Promise.resolve(resultado).then(alResolver),
  };
  return consulta;
}

// Cada llamada a from() devuelve, en orden, una consulta con el resultado indicado.
function usarConsultas(...resultados: Resultado[]) {
  const consultas = resultados.map(consultaFalsa);
  const desde = vi.fn();
  consultas.forEach((consulta) => desde.mockReturnValueOnce(consulta));
  vi.mocked(crearClienteSupabase).mockResolvedValue({
    from: desde,
  } as unknown as Awaited<ReturnType<typeof crearClienteSupabase>>);
  return { consultas, desde };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guardarCalificacion", () => {
  it("si el mensaje ya tenía calificación, solo actualiza el valor", async () => {
    const { consultas, desde } = usarConsultas({ data: [{ id: "c-1" }], error: null });

    await guardarCalificacion("m-1", -1);

    expect(desde).toHaveBeenCalledTimes(1);
    expect(desde).toHaveBeenCalledWith("calificaciones");
    expect(consultas[0]?.update).toHaveBeenCalledWith({ valor: -1 });
    expect(consultas[0]?.eq).toHaveBeenCalledWith("mensaje_id", "m-1");
  });

  it("si no había calificación, la inserta", async () => {
    const { consultas } = usarConsultas({ data: [], error: null }, { error: null });

    await guardarCalificacion("m-1", 1);

    expect(consultas[1]?.insert).toHaveBeenCalledWith({ mensaje_id: "m-1", valor: 1 });
  });

  it("si otro pedido insertó justo antes, reintenta como actualización", async () => {
    const { consultas } = usarConsultas(
      { data: [], error: null },
      { error: { code: "23505", message: "duplicate key" } },
      { data: [{ id: "c-1" }], error: null },
    );

    await guardarCalificacion("m-1", 1);

    expect(consultas[2]?.update).toHaveBeenCalledWith({ valor: 1 });
  });

  it("si el reintento tampoco encuentra la fila, falla con el error original", async () => {
    const duplicado = { code: "23505", message: "duplicate key" };
    usarConsultas({ data: [], error: null }, { error: duplicado }, { data: [], error: null });

    await expect(guardarCalificacion("m-1", 1)).rejects.toBe(duplicado);
  });

  it("propaga el error de la base al insertar (por ejemplo, el RLS)", async () => {
    const rechazo = { code: "42501", message: "row-level security" };
    usarConsultas({ data: [], error: null }, { error: rechazo });

    await expect(guardarCalificacion("m-1", 1)).rejects.toBe(rechazo);
  });

  it("propaga el error de la base al actualizar", async () => {
    const caida = new Error("sin conexión");
    usarConsultas({ data: null, error: caida });

    await expect(guardarCalificacion("m-1", 1)).rejects.toBe(caida);
  });
});

describe("listarCalificaciones", () => {
  it("devuelve la calificación de cada mensaje calificado", async () => {
    const { consultas, desde } = usarConsultas({
      data: [
        { mensaje_id: "m-1", valor: 1 },
        { mensaje_id: "m-2", valor: -1 },
      ],
      error: null,
    });

    const calificaciones = await listarCalificaciones(["m-1", "m-2", "m-3"]);

    expect(desde).toHaveBeenCalledWith("calificaciones");
    expect(consultas[0]?.in).toHaveBeenCalledWith("mensaje_id", ["m-1", "m-2", "m-3"]);
    expect(Object.fromEntries(calificaciones)).toEqual({ "m-1": 1, "m-2": -1 });
  });

  it("ignora valores guardados que no son 1 ni -1", async () => {
    usarConsultas({ data: [{ mensaje_id: "m-1", valor: 5 }], error: null });

    expect((await listarCalificaciones(["m-1"])).size).toBe(0);
  });

  it("sin mensajes no consulta la base", async () => {
    const { desde } = usarConsultas();

    expect((await listarCalificaciones([])).size).toBe(0);
    expect(desde).not.toHaveBeenCalled();
  });

  it("propaga el error de la base", async () => {
    const caida = new Error("sin conexión");
    usarConsultas({ data: null, error: caida });

    await expect(listarCalificaciones(["m-1"])).rejects.toBe(caida);
  });
});
