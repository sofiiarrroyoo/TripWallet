import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategoriaDuplicada } from "@/errores";
import { crearCategoria, listarCategorias } from "./categorias";
import { crearClienteSupabase } from "./supabase/clienteServidor";

vi.mock("./supabase/clienteServidor", () => ({ crearClienteSupabase: vi.fn() }));

type Resultado = { data: unknown; error: unknown };

// Imita el query builder de supabase-js: cada método devuelve la misma consulta y al final se espera el resultado.
function consultaFalsa(resultado: Resultado) {
  const consulta = {
    select: vi.fn(() => consulta),
    order: vi.fn(() => consulta),
    insert: vi.fn(() => consulta),
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listarCategorias", () => {
  it("marca como por defecto las que no tienen usuario y pide primero esas", async () => {
    const { consulta, desde } = usarConsulta({
      data: [
        { id: "c-1", usuario_id: null, nombre: "Comida y bebida" },
        { id: "c-2", usuario_id: "u-1", nombre: "Souvenirs" },
      ],
      error: null,
    });

    const categorias = await listarCategorias();

    expect(desde).toHaveBeenCalledWith("categorias");
    expect(consulta.order).toHaveBeenNthCalledWith(1, "usuario_id", { ascending: true, nullsFirst: true });
    expect(categorias).toEqual([
      { id: "c-1", nombre: "Comida y bebida", esPorDefecto: true },
      { id: "c-2", nombre: "Souvenirs", esPorDefecto: false },
    ]);
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(listarCategorias()).rejects.toBe(error);
  });
});

describe("crearCategoria", () => {
  it("guarda el nombre y devuelve la categoría propia creada", async () => {
    const { consulta } = usarConsulta({ data: { id: "c-9", usuario_id: "u-1", nombre: "Souvenirs" }, error: null });

    const categoria = await crearCategoria("Souvenirs");

    expect(consulta.insert).toHaveBeenCalledWith({ nombre: "Souvenirs" });
    expect(categoria).toEqual({ id: "c-9", nombre: "Souvenirs", esPorDefecto: false });
  });

  it("traduce la violación del índice único a ErrorCategoriaDuplicada", async () => {
    usarConsulta({ data: null, error: { code: "23505", message: "duplicate key" } });

    const error = await crearCategoria("Souvenirs").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorCategoriaDuplicada);
    expect((error as ErrorCategoriaDuplicada).nombre).toBe("Souvenirs");
  });

  it("propaga cualquier otro error", async () => {
    const error = { code: "42501", message: "viola el RLS" };
    usarConsulta({ data: null, error });

    await expect(crearCategoria("Souvenirs")).rejects.toBe(error);
  });
});
