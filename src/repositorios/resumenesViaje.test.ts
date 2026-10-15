import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorGastosModificados,
  ErrorNoEncontrado,
  ErrorViajeAbierto,
  ErrorViajeCerrado,
  ErrorViajeSinGastos,
} from "@/errores";
import type { EstadisticasViaje, FotoCotizaciones } from "@/tipos/cierre";
import { cerrarViaje, obtenerResumen, reabrirViaje } from "./resumenesViaje";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data?: unknown; error?: unknown };

function consultaFalsa(resultado: Resultado) {
  const consulta = {
    select: vi.fn(() => consulta),
    eq: vi.fn(() => consulta),
    maybeSingle: vi.fn(async () => resultado),
  };
  return consulta;
}

function usarCliente(resultado: Resultado) {
  const consulta = consultaFalsa(resultado);
  const rpc = vi.fn(async () => resultado);
  const desde = vi.fn(() => consulta);
  vi.mocked(crearClienteSupabase).mockResolvedValue({
    rpc,
    from: desde,
  } as unknown as Awaited<ReturnType<typeof crearClienteSupabase>>);
  return { rpc, desde, consulta };
}

const estadisticas: EstadisticasViaje = {
  monedaBase: "ARS",
  total: 53000,
  cantidadGastos: 5,
  diasDelViaje: 10,
  promedioPorDia: 5300,
  porCategoria: [{ categoria: "Compras", total: 53000, cantidad: 5, porcentajeDelTotal: 100 }],
  gastosMasGrandes: [],
  presupuesto: null,
};

const foto: FotoCotizaciones = {
  monedaBase: "USD",
  fecha: "2026-10-14",
  fuente: "ExchangeRate-API (open.er-api.com)",
  tasas: { ARS: 1450 },
  desactualizada: false,
};

const cierre = {
  viajeId: "viaje-1",
  gastosIds: ["g-1", "g-2"],
  estadisticas,
  cotizacionesCierre: foto,
  resumen: "Gastaste 53.000 ARS.",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cerrarViaje", () => {
  it("llama a la función de Postgres con los datos del cierre", async () => {
    const { rpc } = usarCliente({ error: null });

    await cerrarViaje(cierre);

    expect(rpc).toHaveBeenCalledWith("cerrar_viaje", {
      p_viaje_id: "viaje-1",
      p_gastos_ids: ["g-1", "g-2"],
      p_estadisticas: estadisticas,
      p_cotizaciones_cierre: foto,
      p_resumen: "Gastaste 53.000 ARS.",
    });
  });

  it("manda null cuando no hay resumen del modelo", async () => {
    const { rpc } = usarCliente({ error: null });

    await cerrarViaje({ ...cierre, resumen: null });

    expect(rpc).toHaveBeenCalledWith("cerrar_viaje", expect.objectContaining({ p_resumen: null }));
  });

  it.each([
    ["VIAJE_NO_ENCONTRADO", ErrorNoEncontrado],
    ["VIAJE_CERRADO", ErrorViajeCerrado],
    ["VIAJE_SIN_GASTOS", ErrorViajeSinGastos],
    ["GASTOS_MODIFICADOS", ErrorGastosModificados],
  ])("traduce el error %s a un error propio", async (codigo, claseDeError) => {
    usarCliente({ error: { message: codigo } });

    await expect(cerrarViaje(cierre)).rejects.toBeInstanceOf(claseDeError);
  });

  it("propaga un error desconocido tal cual", async () => {
    const caida = { message: "conexión perdida" };
    usarCliente({ error: caida });

    await expect(cerrarViaje(cierre)).rejects.toBe(caida);
  });
});

describe("reabrirViaje", () => {
  it("llama a la función de Postgres con el id del viaje", async () => {
    const { rpc } = usarCliente({ error: null });

    await reabrirViaje("viaje-1");

    expect(rpc).toHaveBeenCalledWith("reabrir_viaje", { p_viaje_id: "viaje-1" });
  });

  it("traduce que el viaje ya estaba abierto", async () => {
    usarCliente({ error: { message: "VIAJE_ABIERTO" } });

    await expect(reabrirViaje("viaje-1")).rejects.toBeInstanceOf(ErrorViajeAbierto);
  });

  it("traduce que el viaje no existe o es de otra persona", async () => {
    usarCliente({ error: { message: "VIAJE_NO_ENCONTRADO" } });

    await expect(reabrirViaje("viaje-1")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });
});

describe("obtenerResumen", () => {
  const fila = {
    viaje_id: "viaje-1",
    estadisticas,
    cotizaciones_cierre: foto,
    resumen: "Gastaste 53.000 ARS.",
    creado_en: "2026-10-15T12:00:00Z",
  };

  it("lee y valida el resumen guardado", async () => {
    const { desde, consulta } = usarCliente({ data: fila, error: null });

    const resumen = await obtenerResumen("viaje-1");

    expect(desde).toHaveBeenCalledWith("resumenes_viaje");
    expect(consulta.eq).toHaveBeenCalledWith("viaje_id", "viaje-1");
    expect(resumen).toEqual({
      viajeId: "viaje-1",
      estadisticas,
      cotizacionesCierre: foto,
      resumen: "Gastaste 53.000 ARS.",
      creadoEn: "2026-10-15T12:00:00Z",
    });
  });

  it("devuelve null si el viaje no tiene resumen (está abierto)", async () => {
    usarCliente({ data: null, error: null });

    await expect(obtenerResumen("viaje-1")).resolves.toBeNull();
  });

  it("conserva el resumen en null si el modelo no llegó a generarlo", async () => {
    usarCliente({ data: { ...fila, resumen: null }, error: null });

    expect((await obtenerResumen("viaje-1"))?.resumen).toBeNull();
  });

  it("falla si lo guardado no tiene el formato esperado", async () => {
    usarCliente({ data: { ...fila, estadisticas: { total: "mucho" } }, error: null });

    await expect(obtenerResumen("viaje-1")).rejects.toThrow();
  });

  it("propaga el error de la base", async () => {
    const caida = new Error("sin conexión");
    usarCliente({ data: null, error: caida });

    await expect(obtenerResumen("viaje-1")).rejects.toBe(caida);
  });
});
