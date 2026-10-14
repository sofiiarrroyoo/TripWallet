import { readUIMessageStream, simulateReadableStream, type UIMessage } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, expect, it, vi } from "vitest";
import { gastosRegistradosDe } from "@/componentes/chat/mensajesUI";
import { obtenerModelo } from "@/integraciones/modeloLLM";
import * as repositorio from "@/repositorios/mensajes";
import { responderMensaje } from "./chat";
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

const uso = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

beforeEach(() => {
  vi.mocked(obtenerViaje).mockResolvedValue({
    id: "viaje-1", nombre: "MDQ", destino: "MDQ", monedaBase: "ARS", fechaInicio: "2026-10-01", fechaFin: "2026-10-30",
    presupuestoTotal: null, estado: "abierto", creadoEn: "2026-10-01T00:00:00Z",
  });
  vi.mocked(listarCategorias).mockResolvedValue([]);
  vi.mocked(obtenerIdsGastosEliminados).mockResolvedValue([]);
  vi.mocked(repositorio.listarFechasMensajesUsuarioDesde).mockResolvedValue([]);
  vi.mocked(repositorio.listarUltimosMensajes).mockResolvedValue([
    { id: "u", viajeId: "viaje-1", rol: "user", contenido: "x", llamadasTools: [], tokensEntrada: null, tokensSalida: null, modelo: null, creadoEn: "" },
  ]);
  vi.mocked(repositorio.crearMensaje).mockResolvedValue({} as never);
});

// Recorre el camino completo que hace un gasto registrado por el chat, sin modelo real: lo que el servidor manda por
// el stream, convertido en un mensaje por el mismo lector que usa useChat, tiene que dar una tarjeta.
it("un gasto registrado por el modelo llega al navegador como una tarjeta", async () => {
  vi.mocked(registrarGasto).mockResolvedValue({
    id: "g-1", descripcion: "Agua mineral", categoria: "Comida y bebida", fechaGasto: "2026-10-14", montoOriginal: 7000,
    monedaOriginal: "ARS", montoConvertido: 7000, monedaBase: "ARS", cotizacion: 1, fechaCotizacion: "2026-10-14",
    fuente: null, aviso: null,
  });
  vi.mocked(obtenerModelo).mockReturnValue(
    new MockLanguageModelV4({
      doStream: [
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "tool-call", toolCallId: "c1", toolName: "registrar_gasto", input: JSON.stringify({ monto: 7000, moneda: "ARS", categoria: "Comida y bebida", descripcion: "Agua mineral" }) },
              { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: uso },
            ],
          }),
        },
        {
          stream: simulateReadableStream({
            chunks: [
              { type: "text-start", id: "t" },
              { type: "text-delta", id: "t", delta: "Listo, lo anoté." },
              { type: "text-end", id: "t" },
              { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: uso },
            ],
          }),
        },
      ],
    }) as never,
  );

  const stream = await responderMensaje("viaje-1", { accion: "enviar", texto: "gaste 7 lucas en un agua mineral", zonaHoraria: "UTC" }, new AbortController().signal);

  // Lo mismo que hace useChat en el navegador: convertir los fragmentos del stream en un mensaje con partes.
  let mensaje: UIMessage | undefined;
  for await (const m of readUIMessageStream({ stream: stream as never })) mensaje = m;

  expect(gastosRegistradosDe(mensaje as UIMessage)).toHaveLength(1);
});
