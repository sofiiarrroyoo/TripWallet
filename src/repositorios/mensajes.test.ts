import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearMensaje, listarFechasMensajesUsuarioDesde, listarUltimosMensajes } from "./mensajes";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data: unknown; error: unknown };

// Imita el query builder de supabase-js: cada método devuelve la misma consulta y al final se espera el resultado.
function consultaFalsa(resultado: Resultado) {
  const consulta = {
    select: vi.fn(() => consulta),
    eq: vi.fn(() => consulta),
    gte: vi.fn(() => consulta),
    order: vi.fn(() => consulta),
    limit: vi.fn(() => consulta),
    insert: vi.fn(() => consulta),
    single: vi.fn(async () => resultado),
    then: (alResolver: (valor: Resultado) => unknown) => Promise.resolve(resultado).then(alResolver),
  };
  return consulta;
}

function usarConsulta(resultado: Resultado) {
  const consulta = consultaFalsa(resultado);
  const desde = vi.fn(() => consulta);
  vi.mocked(crearClienteSupabase).mockResolvedValue({
    from: desde,
  } as unknown as Awaited<ReturnType<typeof crearClienteSupabase>>);
  return { consulta, desde };
}

const filaUsuario = {
  id: "m-1",
  viaje_id: "viaje-1",
  rol: "user",
  contenido: "hola",
  llamadas_tools: [],
  tokens_entrada: null,
  tokens_salida: null,
  modelo: null,
  creado_en: "2026-10-14T12:00:00Z",
};

const filaBot = {
  ...filaUsuario,
  id: "m-2",
  rol: "assistant",
  contenido: "¡Hola!",
  tokens_entrada: 120,
  tokens_salida: 8,
  modelo: "gpt-5.4-mini-2026-03-17",
  creado_en: "2026-10-14T12:00:05Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarUltimosMensajes", () => {
  it("pide los más nuevos del viaje y los devuelve del más viejo al más nuevo", async () => {
    const { consulta, desde } = usarConsulta({ data: [filaBot, filaUsuario], error: null });

    const mensajes = await listarUltimosMensajes("viaje-1", 20);

    expect(desde).toHaveBeenCalledWith("mensajes");
    expect(consulta.eq).toHaveBeenCalledWith("viaje_id", "viaje-1");
    expect(consulta.order).toHaveBeenCalledWith("creado_en", { ascending: false });
    expect(consulta.limit).toHaveBeenCalledWith(20);
    expect(mensajes.map((mensaje) => mensaje.id)).toEqual(["m-1", "m-2"]);
    expect(mensajes[1]).toEqual({
      id: "m-2",
      viajeId: "viaje-1",
      rol: "assistant",
      contenido: "¡Hola!",
      llamadasTools: [],
      tokensEntrada: 120,
      tokensSalida: 8,
      modelo: "gpt-5.4-mini-2026-03-17",
      creadoEn: "2026-10-14T12:00:05Z",
    });
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(listarUltimosMensajes("viaje-1", 20)).rejects.toBe(error);
  });

  it("falla con un rol que no conoce en lugar de inventar uno", async () => {
    usarConsulta({ data: [{ ...filaUsuario, rol: "system" }], error: null });

    await expect(listarUltimosMensajes("viaje-1", 20)).rejects.toThrow(/system/);
  });

  it("lee las llamadas a tools guardadas", async () => {
    const llamada = { nombre: "convertir_moneda", argumentos: { monto: 10 }, resultado: { ok: true } };
    usarConsulta({ data: [{ ...filaBot, llamadas_tools: [llamada] }], error: null });

    const [mensaje] = await listarUltimosMensajes("viaje-1", 20);

    expect(mensaje?.llamadasTools).toEqual([llamada]);
  });

  it("falla si las llamadas a tools guardadas no tienen el formato esperado", async () => {
    usarConsulta({ data: [{ ...filaBot, llamadas_tools: [{ sinNombre: true }] }], error: null });

    await expect(listarUltimosMensajes("viaje-1", 20)).rejects.toThrow();
  });
});

describe("crearMensaje", () => {
  it("guarda las columnas en snake_case y devuelve el mensaje creado", async () => {
    const { consulta } = usarConsulta({ data: filaBot, error: null });

    const creado = await crearMensaje({
      id: "m-2",
      viajeId: "viaje-1",
      rol: "assistant",
      contenido: "¡Hola!",
      tokensEntrada: 120,
      tokensSalida: 8,
      modelo: "gpt-5.4-mini-2026-03-17",
    });

    expect(creado.id).toBe("m-2");
    expect(consulta.insert).toHaveBeenCalledWith({
      id: "m-2",
      viaje_id: "viaje-1",
      rol: "assistant",
      contenido: "¡Hola!",
      llamadas_tools: [],
      tokens_entrada: 120,
      tokens_salida: 8,
      modelo: "gpt-5.4-mini-2026-03-17",
    });
  });

  it("deja que la base genere el id y los campos opcionales en null para el mensaje del usuario", async () => {
    const { consulta } = usarConsulta({ data: filaUsuario, error: null });

    await crearMensaje({ viajeId: "viaje-1", rol: "user", contenido: "hola" });

    expect(consulta.insert).toHaveBeenCalledWith({
      id: undefined,
      viaje_id: "viaje-1",
      rol: "user",
      contenido: "hola",
      llamadas_tools: [],
      tokens_entrada: null,
      tokens_salida: null,
      modelo: null,
    });
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("viola el RLS");
    usarConsulta({ data: null, error });

    await expect(crearMensaje({ viajeId: "viaje-1", rol: "user", contenido: "hola" })).rejects.toBe(error);
  });
});

describe("listarFechasMensajesUsuarioDesde", () => {
  it("cuenta solo los mensajes del usuario desde la fecha pedida", async () => {
    const { consulta } = usarConsulta({
      data: [{ creado_en: "2026-10-14T11:10:00Z" }, { creado_en: "2026-10-14T11:40:00Z" }],
      error: null,
    });
    const desde = new Date("2026-10-14T11:00:00Z");

    const fechas = await listarFechasMensajesUsuarioDesde(desde);

    expect(consulta.eq).toHaveBeenCalledWith("rol", "user");
    expect(consulta.gte).toHaveBeenCalledWith("creado_en", "2026-10-14T11:00:00.000Z");
    expect(fechas).toEqual([new Date("2026-10-14T11:10:00Z"), new Date("2026-10-14T11:40:00Z")]);
  });
});
