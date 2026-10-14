import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorViajeCerrado } from "@/errores";
import { crearGasto, eliminarGasto } from "./gastos";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data: unknown; error: unknown };

// Imita el query builder de supabase-js: cada método devuelve la misma consulta y al final se espera el resultado.
function consultaFalsa(resultado: Resultado) {
  const consulta = {
    insert: vi.fn(() => consulta),
    delete: vi.fn(() => consulta),
    select: vi.fn(() => consulta),
    eq: vi.fn(() => consulta),
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

const fila = {
  id: "g-1",
  viaje_id: "viaje-1",
  monto_original: 15000,
  moneda_original: "CLP",
  monto_convertido: 21750,
  cotizacion: 1.45,
  fecha_cotizacion: "2026-10-14",
  categoria_id: "c-1",
  descripcion: "Cena",
  fecha_gasto: "2026-10-14",
  creado_en: "2026-10-14T21:00:00Z",
};

const nuevoGasto = {
  viajeId: "viaje-1",
  montoOriginal: 15000,
  monedaOriginal: "CLP",
  montoConvertido: 21750,
  cotizacion: 1.45,
  fechaCotizacion: "2026-10-14",
  categoriaId: "c-1",
  descripcion: "Cena",
  fechaGasto: "2026-10-14",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("crearGasto", () => {
  it("guarda las columnas en snake_case y devuelve el gasto en el formato de la app", async () => {
    const { consulta, desde } = usarConsulta({ data: fila, error: null });

    const gasto = await crearGasto(nuevoGasto);

    expect(desde).toHaveBeenCalledWith("gastos");
    expect(consulta.insert).toHaveBeenCalledWith({
      viaje_id: "viaje-1",
      monto_original: 15000,
      moneda_original: "CLP",
      monto_convertido: 21750,
      cotizacion: 1.45,
      fecha_cotizacion: "2026-10-14",
      categoria_id: "c-1",
      descripcion: "Cena",
      fecha_gasto: "2026-10-14",
    });
    expect(gasto).toEqual({
      id: "g-1",
      viajeId: "viaje-1",
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      cotizacion: 1.45,
      fechaCotizacion: "2026-10-14",
      categoriaId: "c-1",
      descripcion: "Cena",
      fechaGasto: "2026-10-14",
      creadoEn: "2026-10-14T21:00:00Z",
    });
  });

  it("traduce el error del trigger de la base a ErrorViajeCerrado", async () => {
    usarConsulta({ data: null, error: { code: "P0001", message: "VIAJE_CERRADO" } });

    await expect(crearGasto(nuevoGasto)).rejects.toBeInstanceOf(ErrorViajeCerrado);
  });

  it("propaga cualquier otro error", async () => {
    const error = { code: "42501", message: "new row violates row-level security policy" };
    usarConsulta({ data: null, error });

    await expect(crearGasto(nuevoGasto)).rejects.toBe(error);
  });
});

describe("eliminarGasto", () => {
  it("borra el gasto de ese viaje y avisa que lo encontró", async () => {
    const { consulta } = usarConsulta({ data: [{ id: "g-1" }], error: null });

    await expect(eliminarGasto("viaje-1", "g-1")).resolves.toBe(true);

    expect(consulta.delete).toHaveBeenCalled();
    expect(consulta.eq).toHaveBeenCalledWith("id", "g-1");
    expect(consulta.eq).toHaveBeenCalledWith("viaje_id", "viaje-1");
  });

  it("avisa que no encontró nada si no se borró ninguna fila", async () => {
    usarConsulta({ data: [], error: null });

    await expect(eliminarGasto("viaje-1", "g-ajeno")).resolves.toBe(false);
  });

  it("traduce el error del trigger de la base a ErrorViajeCerrado", async () => {
    usarConsulta({ data: null, error: { code: "P0001", message: "VIAJE_CERRADO" } });

    await expect(eliminarGasto("viaje-1", "g-1")).rejects.toBeInstanceOf(ErrorViajeCerrado);
  });
});
