import { beforeEach, describe, expect, it, vi } from "vitest";
import { listarPresupuestosPorCategoria } from "./presupuestos";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data: unknown; error: unknown };

// Imita el query builder de supabase-js: cada método devuelve la misma consulta y al final se espera el resultado.
function consultaFalsa(resultado: Resultado) {
  const consulta = {
    select: vi.fn(() => consulta),
    eq: vi.fn(() => consulta),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarPresupuestosPorCategoria", () => {
  it("devuelve cada presupuesto con el nombre de su categoría, ordenados por nombre", async () => {
    const { consulta, desde } = usarConsulta({
      data: [
        { monto_estimado: 50000, categorias: { nombre: "Transporte" } },
        { monto_estimado: 30000.5, categorias: { nombre: "Comida y bebida" } },
      ],
      error: null,
    });

    const presupuestos = await listarPresupuestosPorCategoria("viaje-1");

    expect(desde).toHaveBeenCalledWith("presupuestos_viaje");
    expect(consulta.eq).toHaveBeenCalledWith("viaje_id", "viaje-1");
    expect(presupuestos).toEqual([
      { categoria: "Comida y bebida", monto: 30000.5 },
      { categoria: "Transporte", monto: 50000 },
    ]);
  });

  it("ignora un presupuesto cuya categoría no se puede leer", async () => {
    usarConsulta({
      data: [
        { monto_estimado: 100, categorias: null },
        { monto_estimado: 200, categorias: { nombre: "Compras" } },
      ],
      error: null,
    });

    await expect(listarPresupuestosPorCategoria("viaje-1")).resolves.toEqual([{ categoria: "Compras", monto: 200 }]);
  });

  it("devuelve una lista vacía si el viaje no tiene presupuesto por categoría", async () => {
    usarConsulta({ data: [], error: null });

    await expect(listarPresupuestosPorCategoria("viaje-1")).resolves.toEqual([]);
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(listarPresupuestosPorCategoria("viaje-1")).rejects.toBe(error);
  });
});
