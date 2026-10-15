import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorNoEncontrado, ErrorValidacion } from "@/errores";
import * as repositorio from "@/repositorios/calificaciones";
import * as repositorioMensajes from "@/repositorios/mensajes";
import type { Mensaje } from "@/tipos/mensaje";
import type { Viaje } from "@/tipos/viaje";
import { calificarRespuesta } from "./calificaciones";
import { obtenerViaje } from "./viajes";

vi.mock("@/repositorios/calificaciones");
vi.mock("@/repositorios/mensajes");
vi.mock("./viajes");

const ID_MENSAJE = "3f2b8c1e-4a5d-4e6f-8a7b-9c0d1e2f3a4b";

const viaje: Viaje = {
  id: "viaje-1",
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-10-10",
  fechaFin: "2026-10-20",
  presupuestoTotal: null,
  estado: "abierto",
  creadoEn: "2026-10-01T12:00:00Z",
};

const respuestaDelBot: Mensaje = {
  id: ID_MENSAJE,
  viajeId: "viaje-1",
  rol: "assistant",
  contenido: "Listo, lo registré.",
  llamadasTools: [],
  tokensEntrada: 100,
  tokensSalida: 10,
  modelo: "gpt-5.4-mini-2026-03-17",
  creadoEn: "2026-10-14T12:00:05Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerViaje).mockResolvedValue(viaje);
  vi.mocked(repositorioMensajes.obtenerMensaje).mockResolvedValue(respuestaDelBot);
  vi.mocked(repositorio.guardarCalificacion).mockResolvedValue(undefined);
});

describe("calificarRespuesta", () => {
  it.each([1, -1] as const)("guarda la calificación %i de una respuesta del bot", async (valor) => {
    await calificarRespuesta("viaje-1", ID_MENSAJE, { valor });

    expect(repositorioMensajes.obtenerMensaje).toHaveBeenCalledWith("viaje-1", ID_MENSAJE);
    expect(repositorio.guardarCalificacion).toHaveBeenCalledWith(ID_MENSAJE, valor);
  });

  it("rechaza un valor inválido sin tocar la base", async () => {
    await expect(calificarRespuesta("viaje-1", ID_MENSAJE, { valor: 5 })).rejects.toBeInstanceOf(ErrorValidacion);

    expect(obtenerViaje).not.toHaveBeenCalled();
    expect(repositorio.guardarCalificacion).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo que no es un objeto", async () => {
    await expect(calificarRespuesta("viaje-1", ID_MENSAJE, null)).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("responde no encontrado si el id del mensaje no es un uuid", async () => {
    await expect(calificarRespuesta("viaje-1", "no-es-uuid", { valor: 1 })).rejects.toMatchObject({
      codigo: "MENSAJE_NO_ENCONTRADO",
    });

    expect(repositorioMensajes.obtenerMensaje).not.toHaveBeenCalled();
  });

  it("responde no encontrado si el mensaje no existe en el viaje", async () => {
    vi.mocked(repositorioMensajes.obtenerMensaje).mockResolvedValue(null);

    await expect(calificarRespuesta("viaje-1", ID_MENSAJE, { valor: 1 })).rejects.toBeInstanceOf(ErrorNoEncontrado);

    expect(repositorio.guardarCalificacion).not.toHaveBeenCalled();
  });

  it("no deja calificar un mensaje de la persona", async () => {
    vi.mocked(repositorioMensajes.obtenerMensaje).mockResolvedValue({ ...respuestaDelBot, rol: "user" });

    await expect(calificarRespuesta("viaje-1", ID_MENSAJE, { valor: 1 })).rejects.toMatchObject({
      codigo: "MENSAJE_NO_ENCONTRADO",
    });

    expect(repositorio.guardarCalificacion).not.toHaveBeenCalled();
  });

  it("propaga que el viaje no existe o es de otra persona", async () => {
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(calificarRespuesta("viaje-9", ID_MENSAJE, { valor: 1 })).rejects.toMatchObject({
      codigo: "VIAJE_NO_ENCONTRADO",
    });

    expect(repositorio.guardarCalificacion).not.toHaveBeenCalled();
  });

  it("permite calificar en un viaje cerrado", async () => {
    vi.mocked(obtenerViaje).mockResolvedValue({ ...viaje, estado: "cerrado" });

    await calificarRespuesta("viaje-1", ID_MENSAJE, { valor: -1 });

    expect(repositorio.guardarCalificacion).toHaveBeenCalledWith(ID_MENSAJE, -1);
  });
});
