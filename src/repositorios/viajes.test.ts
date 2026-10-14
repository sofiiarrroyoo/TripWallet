import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearViaje, listarViajes, obtenerViaje } from "./viajes";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data: unknown; error: unknown };

// Imita el query builder de supabase-js: cada método devuelve la misma consulta y al final se espera el resultado.
function consultaFalsa(resultado: Resultado) {
  const consulta = {
    select: vi.fn(() => consulta),
    order: vi.fn(() => consulta),
    eq: vi.fn(() => consulta),
    insert: vi.fn(() => consulta),
    single: vi.fn(async () => resultado),
    maybeSingle: vi.fn(async () => resultado),
    then: (alResolver: (valor: Resultado) => unknown) => Promise.resolve(resultado).then(alResolver),
  };
  return consulta;
}

function usarConsulta(resultado: Resultado) {
  const consulta = consultaFalsa(resultado);
  vi.mocked(crearClienteSupabase).mockResolvedValue({
    from: vi.fn(() => consulta),
  } as unknown as Awaited<ReturnType<typeof crearClienteSupabase>>);
  return consulta;
}

const fila = {
  id: "viaje-1",
  nombre: "Chile",
  destino: "Santiago",
  moneda_base: "ARS",
  fecha_inicio: "2026-11-01",
  fecha_fin: "2026-11-10",
  presupuesto_total: 1500.5,
  estado: "abierto",
  creado_en: "2026-10-14T12:00:00Z",
};

const viaje = {
  id: "viaje-1",
  nombre: "Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-10",
  presupuestoTotal: 1500.5,
  estado: "abierto",
  creadoEn: "2026-10-14T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarViajes", () => {
  it("convierte las filas al formato de la app, de la más reciente a la más vieja", async () => {
    const consulta = usarConsulta({ data: [fila], error: null });

    await expect(listarViajes()).resolves.toEqual([viaje]);
    expect(consulta.order).toHaveBeenCalledWith("fecha_inicio", { ascending: false });
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(listarViajes()).rejects.toBe(error);
  });

  it("falla con un estado que no conoce en lugar de inventar uno", async () => {
    usarConsulta({ data: [{ ...fila, estado: "pausado" }], error: null });

    await expect(listarViajes()).rejects.toThrow(/pausado/);
  });
});

describe("obtenerViaje", () => {
  it("devuelve null si no existe o es de otro usuario", async () => {
    usarConsulta({ data: null, error: null });

    await expect(obtenerViaje("viaje-1")).resolves.toBeNull();
  });
});

describe("crearViaje", () => {
  it("guarda las columnas en snake_case y devuelve el viaje creado", async () => {
    const consulta = usarConsulta({ data: fila, error: null });

    const creado = await crearViaje({
      nombre: "Chile",
      destino: "Santiago",
      monedaBase: "ARS",
      fechaInicio: "2026-11-01",
      fechaFin: "2026-11-10",
      presupuestoTotal: 1500.5,
    });

    expect(creado).toEqual(viaje);
    expect(consulta.insert).toHaveBeenCalledWith({
      nombre: "Chile",
      destino: "Santiago",
      moneda_base: "ARS",
      fecha_inicio: "2026-11-01",
      fecha_fin: "2026-11-10",
      presupuesto_total: 1500.5,
    });
  });
});
