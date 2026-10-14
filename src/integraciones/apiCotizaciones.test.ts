import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCotizacionNoDisponible } from "@/errores";
import { FUENTE_COTIZACIONES, obtenerTasas } from "./apiCotizaciones";

const cuerpoValido = {
  result: "success",
  base_code: "USD",
  time_last_update_unix: 1_791_936_000, // 2026-10-14 00:00 UTC
  rates: { USD: 1, ARS: 1450.5, CLP: 940 },
};

function respuestaJson(cuerpo: unknown, status = 200) {
  return Response.json(cuerpo, { status });
}

function simularFetch(...respuestas: Array<Response | "colgado">) {
  const fetchFalso = vi.fn(async (_url: string, init?: RequestInit) => {
    const siguiente = respuestas.shift() ?? "colgado";
    if (siguiente !== "colgado") return siguiente;
    // Nunca responde: solo termina cuando el timeout aborta el pedido.
    return new Promise<Response>((_, rechazar) => {
      init?.signal?.addEventListener("abort", () => rechazar(new DOMException("Aborted", "AbortError")));
    });
  });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

// Corre todos los temporizadores (timeouts y esperas entre reintentos) sin esperar de verdad.
async function resolver<T>(promesa: Promise<T>): Promise<T | unknown> {
  const resultado = promesa.catch((error: unknown) => error);
  await vi.runAllTimersAsync();
  return resultado;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("obtenerTasas", () => {
  it("devuelve las tasas validadas con su fecha y fuente", async () => {
    const fetchFalso = simularFetch(respuestaJson(cuerpoValido));

    await expect(resolver(obtenerTasas("USD"))).resolves.toEqual({
      monedaBase: "USD",
      tasas: { USD: 1, ARS: 1450.5, CLP: 940 },
      fecha: "2026-10-14",
      fuente: FUENTE_COTIZACIONES,
    });
    expect(fetchFalso).toHaveBeenCalledWith(
      "https://open.er-api.com/v6/latest/USD",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("le pide a Next que reutilice la respuesta si se indica cada cuánto revalidar", async () => {
    const fetchFalso = simularFetch(respuestaJson(cuerpoValido));

    await resolver(obtenerTasas("USD", { revalidarCadaSegundos: 3600 }));

    expect(fetchFalso).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ next: { revalidate: 3600 } }),
    );
  });

  it("reintenta ante un 5xx y devuelve la respuesta siguiente", async () => {
    const fetchFalso = simularFetch(respuestaJson({}, 503), respuestaJson(cuerpoValido));

    const resultado = await resolver(obtenerTasas("USD"));

    expect(resultado).toMatchObject({ monedaBase: "USD" });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("reintenta ante un timeout", async () => {
    const fetchFalso = simularFetch("colgado", respuestaJson(cuerpoValido));

    const resultado = await resolver(obtenerTasas("USD"));

    expect(resultado).toMatchObject({ monedaBase: "USD" });
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("se rinde después de 3 intentos con rate limit", async () => {
    const fetchFalso = simularFetch(respuestaJson({}, 429), respuestaJson({}, 429), respuestaJson({}, 429));

    const error = await resolver(obtenerTasas("USD"));

    expect(error).toBeInstanceOf(ErrorCotizacionNoDisponible);
    expect(fetchFalso).toHaveBeenCalledTimes(3);
  });

  it("no reintenta un error del cliente como un 404", async () => {
    const fetchFalso = simularFetch(respuestaJson({}, 404));

    const error = await resolver(obtenerTasas("USD"));

    expect(error).toBeInstanceOf(ErrorCotizacionNoDisponible);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["un error de la API", { result: "error", "error-type": "unsupported-code" }],
    ["una tasa negativa", { ...cuerpoValido, rates: { ARS: -1 } }],
    ["otra moneda base", { ...cuerpoValido, base_code: "EUR" }],
  ])("rechaza una respuesta con %s", async (_caso, cuerpo) => {
    simularFetch(respuestaJson(cuerpo));

    await expect(resolver(obtenerTasas("USD"))).resolves.toBeInstanceOf(ErrorCotizacionNoDisponible);
  });
});
