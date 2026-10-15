import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorViajeCerrado } from "@/errores";
import {
  TAMANO_PAGINA_GASTOS,
  crearGasto,
  eliminarGasto,
  listarGastosDelViaje,
  listarIdsExistentes,
  obtenerUltimoGasto,
} from "./gastos";
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
    in: vi.fn(() => consulta),
    order: vi.fn(() => consulta),
    limit: vi.fn(() => consulta),
    range: vi.fn(() => consulta),
    single: vi.fn(async () => resultado),
    maybeSingle: vi.fn(async () => resultado),
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

describe("obtenerUltimoGasto", () => {
  it("pide el más reciente del viaje", async () => {
    const { consulta } = usarConsulta({ data: fila, error: null });

    const gasto = await obtenerUltimoGasto("viaje-1");

    expect(consulta.eq).toHaveBeenCalledWith("viaje_id", "viaje-1");
    expect(consulta.order).toHaveBeenCalledWith("creado_en", { ascending: false });
    expect(consulta.limit).toHaveBeenCalledWith(1);
    expect(gasto).toMatchObject({ id: "g-1", montoOriginal: 15000, categoriaId: "c-1" });
  });

  it("devuelve null si el viaje no tiene gastos", async () => {
    usarConsulta({ data: null, error: null });

    await expect(obtenerUltimoGasto("viaje-1")).resolves.toBeNull();
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(obtenerUltimoGasto("viaje-1")).rejects.toBe(error);
  });
});

describe("listarIdsExistentes", () => {
  it("devuelve los ids que siguen existiendo en el viaje", async () => {
    const { consulta } = usarConsulta({ data: [{ id: "g-1" }], error: null });

    await expect(listarIdsExistentes("viaje-1", ["g-1", "g-2"])).resolves.toEqual(["g-1"]);

    expect(consulta.eq).toHaveBeenCalledWith("viaje_id", "viaje-1");
    expect(consulta.in).toHaveBeenCalledWith("id", ["g-1", "g-2"]);
  });

  it("no consulta la base si no hay ids", async () => {
    await expect(listarIdsExistentes("viaje-1", [])).resolves.toEqual([]);

    expect(crearClienteSupabase).not.toHaveBeenCalled();
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(listarIdsExistentes("viaje-1", ["g-1"])).rejects.toBe(error);
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

describe("listarGastosDelViaje", () => {
  const filaConCategoria = (id: string, categorias: { nombre: string } | null = { nombre: "Comida y bebida" }) => ({
    id,
    descripcion: "Cena",
    fecha_gasto: "2026-10-14",
    monto_original: 15000,
    moneda_original: "CLP",
    monto_convertido: 21750,
    cotizacion: 1.45,
    fecha_cotizacion: "2026-10-14",
    creado_en: "2026-10-14T21:00:00Z",
    categorias,
  });

  // Devuelve una página distinta en cada pedido, como hace la base cuando hay más filas que el tope.
  function usarPaginas(paginas: unknown[][]) {
    let pagina = 0;
    const consulta = {
      select: vi.fn(() => consulta),
      eq: vi.fn(() => consulta),
      order: vi.fn(() => consulta),
      range: vi.fn(() => consulta),
      then: (alResolver: (valor: Resultado) => unknown) =>
        Promise.resolve({ data: paginas[pagina++] ?? [], error: null }).then(alResolver),
    };
    vi.mocked(crearClienteSupabase).mockResolvedValue({
      from: vi.fn(() => consulta),
    } as unknown as Awaited<ReturnType<typeof crearClienteSupabase>>);
    return consulta;
  }

  it("devuelve los gastos con el nombre de su categoría, del más reciente al más viejo", async () => {
    const consulta = usarPaginas([[filaConCategoria("g-1")]]);

    const gastos = await listarGastosDelViaje("viaje-1");

    expect(consulta.eq).toHaveBeenCalledWith("viaje_id", "viaje-1");
    expect(consulta.order).toHaveBeenNthCalledWith(1, "fecha_gasto", { ascending: false });
    expect(consulta.order).toHaveBeenNthCalledWith(2, "creado_en", { ascending: false });
    expect(consulta.order).toHaveBeenNthCalledWith(3, "id", { ascending: true });
    expect(gastos).toEqual([
      {
        id: "g-1",
        descripcion: "Cena",
        categoria: "Comida y bebida",
        fechaGasto: "2026-10-14",
        montoOriginal: 15000,
        monedaOriginal: "CLP",
        montoConvertido: 21750,
        cotizacion: 1.45,
        fechaCotizacion: "2026-10-14",
        creadoEn: "2026-10-14T21:00:00Z",
      },
    ]);
  });

  it("no descarta un gasto cuya categoría no se puede leer: cambiaría los totales", async () => {
    usarPaginas([[filaConCategoria("g-1", null)]]);

    await expect(listarGastosDelViaje("viaje-1")).resolves.toMatchObject([{ id: "g-1", categoria: "Sin categoría" }]);
  });

  it("devuelve una lista vacía si el viaje no tiene gastos", async () => {
    usarPaginas([[]]);

    await expect(listarGastosDelViaje("viaje-1")).resolves.toEqual([]);
  });

  it("sigue pidiendo páginas mientras la anterior venga llena, para no perder gastos", async () => {
    const paginaLlena = Array.from({ length: TAMANO_PAGINA_GASTOS }, (_, i) => filaConCategoria(`g-${i}`));
    const consulta = usarPaginas([paginaLlena, [filaConCategoria("g-ultimo")]]);

    const gastos = await listarGastosDelViaje("viaje-1");

    expect(gastos).toHaveLength(TAMANO_PAGINA_GASTOS + 1);
    expect(consulta.range).toHaveBeenNthCalledWith(1, 0, TAMANO_PAGINA_GASTOS - 1);
    expect(consulta.range).toHaveBeenNthCalledWith(2, TAMANO_PAGINA_GASTOS, 2 * TAMANO_PAGINA_GASTOS - 1);
  });

  it("propaga el error de Supabase", async () => {
    const error = new Error("falla de la base");
    usarConsulta({ data: null, error });

    await expect(listarGastosDelViaje("viaje-1")).rejects.toBe(error);
  });
});
