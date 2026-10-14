import { beforeEach, describe, expect, it, vi } from "vitest";
import { guardarCotizacion, obtenerUltimaCotizacion } from "./cotizaciones";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data: unknown; error: unknown };

// Imita el query builder de supabase-js: cada método devuelve la misma consulta y al final se espera el resultado.
function consultaFalsa(resultado: Resultado) {
  const consulta = {
    select: vi.fn(() => consulta),
    eq: vi.fn(() => consulta),
    order: vi.fn(() => consulta),
    limit: vi.fn(() => consulta),
    maybeSingle: vi.fn(async () => resultado),
    insert: vi.fn(async () => resultado),
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

const fila = {
  moneda_base: "ARS",
  fecha: "2026-10-14",
  tasas: { ARS: 1, CLP: 0.6896551724, USD: 0.00069 },
  fuente: "ExchangeRate-API (open.er-api.com)",
  obtenida_en: "2026-10-14T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("obtenerUltimaCotizacion", () => {
  it("pide la más reciente de esa moneda base y la convierte al formato de la app", async () => {
    const { consulta, desde } = usarConsulta({ data: fila, error: null });

    const cotizacion = await obtenerUltimaCotizacion("ARS");

    expect(desde).toHaveBeenCalledWith("cotizaciones");
    expect(consulta.eq).toHaveBeenCalledWith("moneda_base", "ARS");
    expect(consulta.order).toHaveBeenCalledWith("fecha", { ascending: false });
    expect(consulta.limit).toHaveBeenCalledWith(1);
    expect(cotizacion).toEqual({
      monedaBase: "ARS",
      fecha: "2026-10-14",
      tasas: { ARS: 1, CLP: 0.6896551724, USD: 0.00069 },
      fuente: "ExchangeRate-API (open.er-api.com)",
      obtenidaEn: "2026-10-14T10:00:00Z",
    });
  });

  it("devuelve null si no hay ninguna guardada", async () => {
    usarConsulta({ data: null, error: null });

    await expect(obtenerUltimaCotizacion("ARS")).resolves.toBeNull();
  });

  it("falla si las tasas guardadas no tienen el formato esperado", async () => {
    usarConsulta({ data: { ...fila, tasas: { CLP: -1 } }, error: null });

    await expect(obtenerUltimaCotizacion("ARS")).rejects.toThrow();
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(obtenerUltimaCotizacion("ARS")).rejects.toBe(error);
  });
});

describe("guardarCotizacion", () => {
  const cotizacion = {
    monedaBase: "ARS",
    fecha: "2026-10-14",
    tasas: { ARS: 1, CLP: 0.6896551724 },
    fuente: "ExchangeRate-API (open.er-api.com)",
  };

  it("guarda las columnas en snake_case", async () => {
    const { consulta } = usarConsulta({ data: null, error: null });

    await guardarCotizacion(cotizacion);

    expect(consulta.insert).toHaveBeenCalledWith({
      moneda_base: "ARS",
      fecha: "2026-10-14",
      tasas: { ARS: 1, CLP: 0.6896551724 },
      fuente: "ExchangeRate-API (open.er-api.com)",
    });
  });

  it("ignora el error si esa cotización ya estaba guardada (pedidos simultáneos)", async () => {
    usarConsulta({ data: null, error: { code: "23505", message: "duplicate key" } });

    await expect(guardarCotizacion(cotizacion)).resolves.toBeUndefined();
  });

  it("propaga cualquier otro error", async () => {
    const error = { code: "42501", message: "viola el RLS" };
    usarConsulta({ data: null, error });

    await expect(guardarCotizacion(cotizacion)).rejects.toBe(error);
  });
});
