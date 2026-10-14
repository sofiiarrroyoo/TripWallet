import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorLimiteExcedido,
  ErrorNoEncontrado,
  ErrorSinMensajePendiente,
  ErrorValidacion,
} from "@/errores";
import { obtenerModelo } from "@/integraciones/modeloLLM";
import * as repositorio from "@/repositorios/mensajes";
import type { Mensaje } from "@/tipos/mensaje";
import type { Viaje } from "@/tipos/viaje";
import { LIMITE_MENSAJES_POR_HORA, cargarChat, responderMensaje } from "./chat";
import { obtenerViaje } from "./viajes";

vi.mock("@/repositorios/mensajes");
vi.mock("./viajes");
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

function mensaje(rol: Mensaje["rol"], contenido: string): Mensaje {
  return {
    id: `${rol}-${contenido}`,
    viajeId: viaje.id,
    rol,
    contenido,
    llamadasTools: [],
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
});
