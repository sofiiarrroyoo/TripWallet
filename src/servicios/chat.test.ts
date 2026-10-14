import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorLimiteExcedido,
  ErrorNoEncontrado,
  ErrorSinMensajePendiente,
  ErrorValidacion,
  ErrorViajeCerrado,
} from "@/errores";
import { obtenerModelo } from "@/integraciones/modeloLLM";
import * as repositorio from "@/repositorios/mensajes";
import type { Categoria } from "@/tipos/categoria";
import type { GastoRegistrado } from "@/tipos/gasto";
import type { Mensaje } from "@/tipos/mensaje";
import type { LlamadaTool } from "@/validaciones/mensajes";
import type { Viaje } from "@/tipos/viaje";
import { LIMITE_MENSAJES_POR_HORA, cargarChat, responderMensaje } from "./chat";
import { listarCategorias } from "./categorias";
import { obtenerIdsGastosEliminados, registrarGasto } from "./gastos";
import { obtenerViaje } from "./viajes";

vi.mock("@/repositorios/mensajes");
vi.mock("./viajes");
vi.mock("./categorias");
vi.mock("./gastos");
vi.mock("./cotizaciones");
vi.mock("@/integraciones/modeloLLM", () => ({
  obtenerModelo: vi.fn(),
  obtenerNombreModelo: () => "modelo-de-prueba",
  AJUSTES_GENERACION: { maxOutputTokens: 100 },
}));

const ZONA = "America/Argentina/Buenos_Aires";

const viaje: Viaje = {
  id: "viaje-1",
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-10",
  presupuestoTotal: null,
  estado: "abierto",
  creadoEn: "2026-10-14T12:00:00Z",
};

const categorias: Categoria[] = [
  { id: "c-1", nombre: "Comida y bebida", esPorDefecto: true },
  { id: "c-2", nombre: "Transporte", esPorDefecto: true },
];

function mensaje(rol: Mensaje["rol"], contenido: string, llamadasTools: LlamadaTool[] = []): Mensaje {
  return {
    id: `${rol}-${contenido}`,
    viajeId: viaje.id,
    rol,
    contenido,
    llamadasTools,
    tokensEntrada: null,
    tokensSalida: null,
    modelo: null,
    creadoEn: "2026-10-14T12:00:00Z",
  };
}

function usarModelo(modelo: MockLanguageModelV4) {
  vi.mocked(obtenerModelo).mockReturnValue(modelo as unknown as ReturnType<typeof obtenerModelo>);
  return modelo;
}

function modeloQueResponde(textos: string[], tokens = { entrada: 10, salida: 5 }) {
  return usarModelo(
    new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "t1" },
            ...textos.map((delta) => ({ type: "text-delta" as const, id: "t1", delta })),
            { type: "text-end", id: "t1" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: { total: tokens.entrada, noCache: tokens.entrada, cacheRead: undefined, cacheWrite: undefined },
                outputTokens: { total: tokens.salida, text: tokens.salida, reasoning: undefined },
              },
            },
          ],
        }),
      }),
    }),
  );
}

// Escribe el primer fragmento y se queda esperando, como un modelo lento, hasta que lo cancelan.
function modeloQueSeCuelga(primerTexto: string) {
  return usarModelo(
    new MockLanguageModelV4({
      doStream: async ({ abortSignal }) => ({
        stream: new ReadableStream({
          start(controlador) {
            controlador.enqueue({ type: "text-start", id: "t1" });
            controlador.enqueue({ type: "text-delta", id: "t1", delta: primerTexto });
            abortSignal?.addEventListener("abort", () =>
              controlador.error(new DOMException("Aborted", "AbortError")),
            );
          },
        }),
      }),
    }),
  );
}

function modeloQueFalla() {
  return usarModelo(
    new MockLanguageModelV4({
      doStream: async () => {
        throw new Error("OpenAI no responde");
      },
    }),
  );
}

type Fragmento = { type: string; messageId?: string; delta?: string };

async function leerTodo(stream: ReadableStream<unknown>, alLeer?: (fragmento: Fragmento) => void) {
  const fragmentos: Fragmento[] = [];
  const lector = stream.getReader();
  for (let lectura = await lector.read(); !lectura.done; lectura = await lector.read()) {
    const fragmento = lectura.value as Fragmento;
    fragmentos.push(fragmento);
    alLeer?.(fragmento);
  }
  return fragmentos;
}

const sinSenal = () => new AbortController().signal;
const enviar = (texto: string) => ({ accion: "enviar", texto, zonaHoraria: ZONA });
const reintentar = { accion: "reintentar", zonaHoraria: ZONA };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(obtenerViaje).mockResolvedValue(viaje);
  vi.mocked(listarCategorias).mockResolvedValue(categorias);
  vi.mocked(obtenerIdsGastosEliminados).mockResolvedValue([]);
  vi.mocked(repositorio.listarFechasMensajesUsuarioDesde).mockResolvedValue([]);
  vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([mensaje("user", "hola")]);
  vi.mocked(repositorio.crearMensaje).mockImplementation(async (nuevo) => mensaje(nuevo.rol, nuevo.contenido));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("responderMensaje", () => {
  it("guarda el mensaje del usuario, hace streaming de la respuesta y la guarda con tokens y modelo", async () => {
    modeloQueResponde(["Hola", " mundo"]);

    const stream = await responderMensaje("viaje-1", enviar("  hola  "), sinSenal());
    const fragmentos = await leerTodo(stream);

    const textoStream = fragmentos.filter((f) => f.type === "text-delta").map((f) => f.delta).join("");
    expect(textoStream).toBe("Hola mundo");
    const idEnElStream = fragmentos.find((f) => f.type === "start")?.messageId;
    expect(idEnElStream).toEqual(expect.any(String));

    expect(repositorio.crearMensaje).toHaveBeenNthCalledWith(1, { viajeId: "viaje-1", rol: "user", contenido: "hola" });
    expect(repositorio.crearMensaje).toHaveBeenNthCalledWith(2, {
      id: idEnElStream,
      viajeId: "viaje-1",
      rol: "assistant",
      contenido: "Hola mundo",
      llamadasTools: [],
      tokensEntrada: 10,
      tokensSalida: 5,
      modelo: "modelo-de-prueba",
    });
  });

  it("le pasa al modelo el contexto del viaje y los últimos 20 mensajes", async () => {
    const modelo = modeloQueResponde(["ok"]);
    vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([
      mensaje("user", "primero"),
      mensaje("assistant", "respuesta"),
      mensaje("user", "segundo"),
    ]);

    await leerTodo(await responderMensaje("viaje-1", enviar("segundo"), sinSenal()));

    expect(repositorio.listarUltimosMensajes).toHaveBeenCalledWith("viaje-1", 20);
    const prompt = modelo.doStreamCalls[0]?.prompt ?? [];
    expect(prompt.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(JSON.stringify(prompt[0])).toContain("Vacaciones en Chile");
    expect(JSON.stringify(prompt[3])).toContain("segundo");
  });

  it("rechaza un mensaje inválido sin tocar la base ni el modelo", async () => {
    const modelo = modeloQueResponde(["ok"]);

    await expect(responderMensaje("viaje-1", enviar("   "), sinSenal())).rejects.toBeInstanceOf(ErrorValidacion);

    expect(obtenerViaje).not.toHaveBeenCalled();
    expect(repositorio.crearMensaje).not.toHaveBeenCalled();
    expect(modelo.doStreamCalls).toHaveLength(0);
  });

  it("no guarda ni responde si el viaje no es del usuario", async () => {
    const modelo = modeloQueResponde(["ok"]);
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(responderMensaje("ajeno", enviar("hola"), sinSenal())).rejects.toBeInstanceOf(ErrorNoEncontrado);

    expect(repositorio.crearMensaje).not.toHaveBeenCalled();
    expect(modelo.doStreamCalls).toHaveLength(0);
  });

  describe("límite por hora", () => {
    it("deja pasar mientras haya lugar", async () => {
      modeloQueResponde(["ok"]);
      const fechas = Array.from({ length: LIMITE_MENSAJES_POR_HORA - 1 }, () => new Date());
      vi.mocked(repositorio.listarFechasMensajesUsuarioDesde).mockResolvedValue(fechas);

      await leerTodo(await responderMensaje("viaje-1", enviar("hola"), sinSenal()));

      expect(repositorio.crearMensaje).toHaveBeenCalledTimes(2);
    });

    it("rechaza al llegar al tope y dice en cuántos segundos se libera un lugar", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      const modelo = modeloQueResponde(["ok"]);
      // El más viejo se mandó hace 50 minutos: se vence en 10.
      const fechas = Array.from(
        { length: LIMITE_MENSAJES_POR_HORA },
        (_, i) => new Date(Date.parse("2026-10-14T11:10:00Z") + i * 60_000),
      );
      vi.mocked(repositorio.listarFechasMensajesUsuarioDesde).mockResolvedValue(fechas);

      const error = await responderMensaje("viaje-1", enviar("hola"), sinSenal()).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ErrorLimiteExcedido);
      expect((error as ErrorLimiteExcedido).segundosParaReintentar).toBe(600);
      expect(repositorio.crearMensaje).not.toHaveBeenCalled();
      expect(modelo.doStreamCalls).toHaveLength(0);
    });

    it("cuenta desde hace una hora", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      modeloQueResponde(["ok"]);

      await leerTodo(await responderMensaje("viaje-1", enviar("hola"), sinSenal()));

      expect(repositorio.listarFechasMensajesUsuarioDesde).toHaveBeenCalledWith(new Date("2026-10-14T11:00:00Z"));
    });
  });

  describe("reintentar", () => {
    it("vuelve a pedir la respuesta del último mensaje sin duplicarlo ni gastar cupo", async () => {
      modeloQueResponde(["ahora sí"]);

      await leerTodo(await responderMensaje("viaje-1", reintentar, sinSenal()));

      expect(repositorio.listarFechasMensajesUsuarioDesde).not.toHaveBeenCalled();
      expect(repositorio.crearMensaje).toHaveBeenCalledTimes(1);
      expect(repositorio.crearMensaje).toHaveBeenCalledWith(expect.objectContaining({ rol: "assistant", contenido: "ahora sí" }));
    });

    it("se rechaza si el último mensaje ya tiene respuesta", async () => {
      const modelo = modeloQueResponde(["ok"]);
      vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([mensaje("user", "hola"), mensaje("assistant", "hola!")]);

      await expect(responderMensaje("viaje-1", reintentar, sinSenal())).rejects.toBeInstanceOf(ErrorSinMensajePendiente);

      expect(modelo.doStreamCalls).toHaveLength(0);
      expect(repositorio.crearMensaje).not.toHaveBeenCalled();
    });

    it("se rechaza si el chat está vacío", async () => {
      vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([]);

      await expect(responderMensaje("viaje-1", reintentar, sinSenal())).rejects.toBeInstanceOf(ErrorSinMensajePendiente);
    });
  });

  describe("cuando algo sale distinto", () => {
    it("si la persona cancela, guarda lo que alcanzó a escribir, sin tokens", async () => {
      modeloQueSeCuelga("Estoy escribiendo");
      const controlador = new AbortController();

      const stream = await responderMensaje("viaje-1", enviar("hola"), controlador.signal);
      await leerTodo(stream, (fragmento) => {
        if (fragmento.type === "text-delta") controlador.abort();
      });

      expect(repositorio.crearMensaje).toHaveBeenLastCalledWith(
        expect.objectContaining({
          rol: "assistant",
          contenido: "Estoy escribiendo",
          tokensEntrada: null,
          tokensSalida: null,
        }),
      );
    });

    it("si el modelo falla, el mensaje del usuario queda guardado y la respuesta no", async () => {
      modeloQueFalla();

      const fragmentos = await leerTodo(await responderMensaje("viaje-1", enviar("hola"), sinSenal()));

      expect(fragmentos.some((f) => f.type === "error")).toBe(true);
      expect(repositorio.crearMensaje).toHaveBeenCalledTimes(1);
      expect(repositorio.crearMensaje).toHaveBeenCalledWith({ viajeId: "viaje-1", rol: "user", contenido: "hola" });
    });

    it("al navegador le llega un mensaje genérico, no el detalle del error", async () => {
      modeloQueFalla();

      const fragmentos = await leerTodo(await responderMensaje("viaje-1", enviar("hola"), sinSenal()));

      const error = fragmentos.find((f) => f.type === "error") as { errorText?: string } | undefined;
      expect(error?.errorText).toBe("El asistente no pudo responder.");
      expect(JSON.stringify(fragmentos)).not.toContain("OpenAI no responde");
    });

    it("si no se puede guardar la respuesta, el stream igual termina bien", async () => {
      modeloQueResponde(["Hola"]);
      vi.mocked(repositorio.crearMensaje)
        .mockImplementationOnce(async (nuevo) => mensaje(nuevo.rol, nuevo.contenido))
        .mockRejectedValueOnce(new Error("base caída"));

      const fragmentos = await leerTodo(await responderMensaje("viaje-1", enviar("hola"), sinSenal()));

      expect(fragmentos.at(-1)?.type).toBe("finish");
    });
  });
});

describe("cargarChat", () => {
  it("devuelve el viaje con sus últimos 50 mensajes", async () => {
    vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([mensaje("user", "hola")]);

    const chat = await cargarChat("viaje-1");

    expect(chat.viaje).toEqual(viaje);
    expect(chat.mensajes).toHaveLength(1);
    expect(repositorio.listarUltimosMensajes).toHaveBeenCalledWith("viaje-1", 50);
  });

  it("no lee mensajes de un viaje que no es del usuario", async () => {
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(cargarChat("ajeno")).rejects.toBeInstanceOf(ErrorNoEncontrado);
    expect(repositorio.listarUltimosMensajes).not.toHaveBeenCalled();
  });

  describe("gastos eliminados", () => {
    const gasto = (id: string) => ({
      id,
      descripcion: "Cena",
      categoria: "Comida y bebida",
      fechaGasto: "2026-10-14",
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      monedaBase: "ARS",
      cotizacion: 1.45,
      fechaCotizacion: "2026-10-14",
      fuente: null,
      aviso: null,
    });

    const conTarjeta = (id: string) =>
      mensaje("assistant", "Listo", [
        { nombre: "registrar_gasto", argumentos: { monto: 15000 }, resultado: { ok: true, gasto: gasto(id) } },
      ]);

    it("pregunta cuáles de los gastos que tuvieron tarjeta ya no existen", async () => {
      vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([
        mensaje("user", "pagué la cena"),
        conTarjeta("g-1"),
        mensaje("user", "y el taxi"),
        conTarjeta("g-2"),
      ]);
      vi.mocked(obtenerIdsGastosEliminados).mockResolvedValue(["g-1"]);

      const chat = await cargarChat("viaje-1");

      expect(obtenerIdsGastosEliminados).toHaveBeenCalledWith("viaje-1", ["g-1", "g-2"]);
      expect(chat.gastosEliminados).toEqual(["g-1"]);
    });

    it("ignora las llamadas que fallaron, las de otras tools y las mal formadas", async () => {
      vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([
        mensaje("assistant", "No pude", [
          { nombre: "registrar_gasto", argumentos: {}, resultado: { ok: false, codigo: "VIAJE_CERRADO" } },
          { nombre: "convertir_moneda", argumentos: {}, resultado: { ok: true } },
          { nombre: "registrar_gasto", argumentos: {}, resultado: { ok: true, gasto: { id: "g-9" } } },
        ]),
      ]);

      await cargarChat("viaje-1");

      expect(obtenerIdsGastosEliminados).toHaveBeenCalledWith("viaje-1", []);
    });
  });
});

describe("tools", () => {
  const entradaGasto = { monto: 15000, moneda: "CLP", categoria: "Comida y bebida", descripcion: "Cena" };

  const gastoRegistrado: GastoRegistrado = {
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

  const usoDe = (entrada: number, salida: number) => ({
    inputTokens: { total: entrada, noCache: entrada, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: salida, text: salida, reasoning: undefined },
  });

  // Un paso del modelo en el que decide llamar a una tool.
  function pasoConTool(toolName: string, entrada: unknown, tokens = { entrada: 100, salida: 20 }) {
    return {
      stream: simulateReadableStream({
        chunks: [
          { type: "tool-call" as const, toolCallId: `llamada-${toolName}`, toolName, input: JSON.stringify(entrada) },
          {
            type: "finish" as const,
            finishReason: { unified: "tool-calls" as const, raw: undefined },
            usage: usoDe(tokens.entrada, tokens.salida),
          },
        ],
      }),
    };
  }

  // Un paso del modelo en el que responde con texto.
  function pasoConTexto(texto: string, tokens = { entrada: 150, salida: 10 }) {
    return {
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start" as const, id: "t1" },
          { type: "text-delta" as const, id: "t1", delta: texto },
          { type: "text-end" as const, id: "t1" },
          {
            type: "finish" as const,
            finishReason: { unified: "stop" as const, raw: undefined },
            usage: usoDe(tokens.entrada, tokens.salida),
          },
        ],
      }),
    };
  }

  function modeloEnPasos(...pasos: Array<ReturnType<typeof pasoConTool> | ReturnType<typeof pasoConTexto>>) {
    return usarModelo(new MockLanguageModelV4({ doStream: pasos }));
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 15:00 UTC del 14/10: en Buenos Aires también es 14/10.
    vi.setSystemTime(new Date("2026-10-14T15:00:00Z"));
  });

  it("el modelo registra un gasto, ve el resultado y confirma; todo queda guardado en el mensaje", async () => {
    vi.mocked(registrarGasto).mockResolvedValue(gastoRegistrado);
    modeloEnPasos(pasoConTool("registrar_gasto", entradaGasto), pasoConTexto("Listo, lo registré."));

    const fragmentos = await leerTodo(await responderMensaje("viaje-1", enviar("pagué 15 lucas chilenas la cena"), sinSenal()));

    // El viaje y la fecha de hoy los puso el servidor.
    expect(registrarGasto).toHaveBeenCalledWith("viaje-1", entradaGasto, "2026-10-14");
    expect(fragmentos.some((f) => f.type === "tool-output-available")).toBe(true);
    expect(repositorio.crearMensaje).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rol: "assistant",
        contenido: "Listo, lo registré.",
        llamadasTools: [
          { nombre: "registrar_gasto", argumentos: entradaGasto, resultado: { ok: true, gasto: gastoRegistrado } },
        ],
        // Suma de los dos pasos.
        tokensEntrada: 250,
        tokensSalida: 30,
      }),
    );
  });

  it("si la tool falla, el modelo recibe la falla como resultado y la explica", async () => {
    vi.mocked(registrarGasto).mockRejectedValue(new ErrorViajeCerrado());
    modeloEnPasos(pasoConTool("registrar_gasto", entradaGasto), pasoConTexto("El viaje está cerrado, no puedo registrarlo."));

    await leerTodo(await responderMensaje("viaje-1", enviar("pagué la cena"), sinSenal()));

    expect(repositorio.crearMensaje).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contenido: "El viaje está cerrado, no puedo registrarlo.",
        llamadasTools: [
          {
            nombre: "registrar_gasto",
            argumentos: entradaGasto,
            resultado: { ok: false, codigo: "VIAJE_CERRADO", mensaje: new ErrorViajeCerrado().message },
          },
        ],
      }),
    );
  });

  it("después de una pregunta con opciones el turno termina y la pregunta queda guardada", async () => {
    const pregunta = { pregunta: "¿En qué pesos pagaste?", opciones: ["Argentinos", "Chilenos"] };
    const modelo = modeloEnPasos(pasoConTool("pedir_datos", pregunta), pasoConTexto("Esto no tendría que decirse."));

    await leerTodo(await responderMensaje("viaje-1", enviar("gasté 5 mil pesos"), sinSenal()));

    expect(modelo.doStreamCalls).toHaveLength(1);
    expect(repositorio.crearMensaje).toHaveBeenLastCalledWith(
      expect.objectContaining({
        rol: "assistant",
        contenido: "",
        llamadasTools: [{ nombre: "pedir_datos", argumentos: pregunta, resultado: { ok: true } }],
      }),
    );
  });

  it("le ofrece al modelo las 5 tools y las categorías disponibles", async () => {
    const modelo = modeloEnPasos(pasoConTexto("ok"));

    await leerTodo(await responderMensaje("viaje-1", enviar("hola"), sinSenal()));

    const llamada = modelo.doStreamCalls[0];
    const nombres = JSON.stringify(llamada?.tools);
    for (const tool of ["registrar_gasto", "convertir_moneda", "eliminar_gasto", "crear_categoria", "pedir_datos"]) {
      expect(nombres).toContain(tool);
    }
    expect(JSON.stringify(llamada?.prompt[0])).toContain("Comida y bebida, Transporte");
  });

  it("las tools no reciben el viaje del modelo: su esquema no tiene ese campo", async () => {
    const modelo = modeloEnPasos(pasoConTexto("ok"));

    await leerTodo(await responderMensaje("viaje-1", enviar("hola"), sinSenal()));

    expect(JSON.stringify(modelo.doStreamCalls[0]?.tools)).not.toMatch(/viajeId|viaje_id/);
  });

  it("una pregunta anterior sin texto propio llega al modelo como la pregunta con sus opciones", async () => {
    const modelo = modeloEnPasos(pasoConTexto("Dale, en pesos chilenos."));
    vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([
      mensaje("user", "gasté 5 mil pesos"),
      mensaje("assistant", "", [
        {
          nombre: "pedir_datos",
          argumentos: { pregunta: "¿En qué pesos pagaste?", opciones: ["Argentinos", "Chilenos"] },
          resultado: { ok: true },
        },
      ]),
      mensaje("user", "Chilenos"),
    ]);

    await leerTodo(await responderMensaje("viaje-1", enviar("Chilenos"), sinSenal()));

    const prompt = JSON.stringify(modelo.doStreamCalls[0]?.prompt);
    expect(prompt).toContain("¿En qué pesos pagaste?");
    expect(prompt).toContain("Opciones: Argentinos / Chilenos");
  });
});
