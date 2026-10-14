import { z } from "zod";
import { ErrorCotizacionNoDisponible } from "@/errores";

const URL_BASE = "https://open.er-api.com/v6/latest";
export const FUENTE_COTIZACIONES = "ExchangeRate-API (open.er-api.com)";

const TIMEOUT_MS = 5_000;
const REINTENTOS = 2;
const ESPERA_INICIAL_MS = 500;

const codigoMoneda = z.string().regex(/^[A-Z]{3}$/);

const esquemaRespuesta = z.object({
  result: z.literal("success"),
  base_code: codigoMoneda,
  time_last_update_unix: z.number().int().positive(),
  rates: z.record(codigoMoneda, z.number().positive()),
});

export type TasasCambio = {
  monedaBase: string;
  // Unidades de cada moneda por una unidad de la moneda base.
  tasas: Record<string, number>;
  fecha: string;
  fuente: string;
};

type OpcionesTasas = {
  // Cuánto puede reutilizar Next la respuesta en su caché del servidor; sin valor, se pide siempre.
  revalidarCadaSegundos?: number;
};

type Intento = { tipo: "ok"; cuerpo: unknown } | { tipo: "reintentable" | "definitivo"; motivo: string };

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}

async function pedirUnaVez(url: string, { revalidarCadaSegundos }: OpcionesTasas): Promise<Intento> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    const respuesta = await fetch(url, {
      signal: controlador.signal,
      ...(revalidarCadaSegundos ? { next: { revalidate: revalidarCadaSegundos } } : { cache: "no-store" }),
    });
    if (respuesta.status === 429 || respuesta.status >= 500) {
      return { tipo: "reintentable", motivo: `HTTP ${respuesta.status}` };
    }
    if (!respuesta.ok) return { tipo: "definitivo", motivo: `HTTP ${respuesta.status}` };
    return { tipo: "ok", cuerpo: await respuesta.json() };
  } catch (error) {
    // Timeout (abort) o falla de red: vale la pena reintentar.
    return { tipo: "reintentable", motivo: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(temporizador);
  }
}

function interpretar(cuerpo: unknown, monedaBase: string): TasasCambio {
  const respuesta = esquemaRespuesta.safeParse(cuerpo);
  if (!respuesta.success || respuesta.data.base_code !== monedaBase) {
    throw new ErrorCotizacionNoDisponible(undefined, {
      cause: respuesta.success ? `Base inesperada: ${respuesta.data.base_code}` : respuesta.error,
    });
  }
  return {
    monedaBase,
    tasas: respuesta.data.rates,
    fecha: new Date(respuesta.data.time_last_update_unix * 1000).toISOString().slice(0, 10),
    fuente: FUENTE_COTIZACIONES,
  };
}

// Reintenta con espera creciente (500 ms, 1 s) ante timeouts, fallas de red, 429 y 5xx.
export async function obtenerTasas(monedaBase: string, opciones: OpcionesTasas = {}): Promise<TasasCambio> {
  const url = `${URL_BASE}/${encodeURIComponent(monedaBase)}`;
  const motivos: string[] = [];

  for (let intento = 0; intento <= REINTENTOS; intento++) {
    if (intento > 0) await esperar(ESPERA_INICIAL_MS * 2 ** (intento - 1));

    const resultado = await pedirUnaVez(url, opciones);
    if (resultado.tipo === "ok") return interpretar(resultado.cuerpo, monedaBase);

    motivos.push(resultado.motivo);
    if (resultado.tipo === "definitivo") break;
  }

  throw new ErrorCotizacionNoDisponible(undefined, { cause: motivos.join("; ") });
}
