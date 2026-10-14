import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorCotizacionNoDisponible,
  ErrorNoEncontrado,
  ErrorValidacion,
  ErrorViajeCerrado,
} from "@/errores";
import * as repositorio from "@/repositorios/gastos";
import type { Gasto } from "@/tipos/gasto";
import type { Viaje } from "@/tipos/viaje";
import { obtenerCategoriaPorNombre } from "./categorias";
import { convertir } from "./cotizaciones";
import { eliminarGasto, eliminarUltimoGasto, obtenerIdsGastosEliminados, registrarGasto } from "./gastos";
import { obtenerViaje } from "./viajes";

vi.mock("@/repositorios/gastos");
vi.mock("./viajes");
vi.mock("./categorias");
vi.mock("./cotizaciones");

const HOY = "2026-10-14";
const ID_GASTO = "3f2b8c1e-4a5d-4e6f-8a7b-9c0d1e2f3a4b";

const viaje: Viaje = {
  id: "viaje-1",
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-10-10",
  fechaFin: "2026-10-20",
  presupuestoTotal: null,
  estado: "abierto",
  creadoEn: "2026-10-01T12:00:00Z",
};

const conversion = {
  montoOriginal: 15000,
  monedaOriginal: "CLP",
  montoConvertido: 21750,
  monedaBase: "ARS",
  cotizacion: 1.45,
  fechaCotizacion: HOY,
  fuente: "ExchangeRate-API (open.er-api.com)",
  aviso: null,
};

const datosGasto = { monto: 15000, moneda: "clp", categoria: "comida y bebida", descripcion: " Cena " };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerViaje).mockResolvedValue(viaje);
  vi.mocked(obtenerCategoriaPorNombre).mockResolvedValue({ id: "c-1", nombre: "Comida y bebida", esPorDefecto: true });
  vi.mocked(convertir).mockResolvedValue(conversion);
  vi.mocked(repositorio.crearGasto).mockImplementation(
    async (nuevo): Promise<Gasto> => ({ id: "g-1", creadoEn: "2026-10-14T21:00:00Z", ...nuevo }),
  );
  vi.mocked(repositorio.eliminarGasto).mockResolvedValue(true);
});

describe("registrarGasto", () => {
  it("convierte a la moneda base del viaje, guarda y devuelve todo lo que muestra la tarjeta", async () => {
    const registrado = await registrarGasto("viaje-1", datosGasto, HOY);

    expect(convertir).toHaveBeenCalledWith({ monto: 15000, monedaOriginal: "CLP", monedaBase: "ARS" });
    expect(obtenerCategoriaPorNombre).toHaveBeenCalledWith("comida y bebida");
    expect(repositorio.crearGasto).toHaveBeenCalledWith({
      viajeId: "viaje-1",
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      cotizacion: 1.45,
      fechaCotizacion: HOY,
      categoriaId: "c-1",
      descripcion: "Cena",
      fechaGasto: HOY,
    });
    expect(registrado).toEqual({
      id: "g-1",
      descripcion: "Cena",
      categoria: "Comida y bebida",
      fechaGasto: HOY,
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      monedaBase: "ARS",
      cotizacion: 1.45,
      fechaCotizacion: HOY,
      fuente: "ExchangeRate-API (open.er-api.com)",
      aviso: null,
    });
  });

  it("usa la fecha de hoy si no se indica una y respeta la que se indica", async () => {
    await registrarGasto("viaje-1", { ...datosGasto, fecha: "2026-10-12" }, HOY);

    expect(repositorio.crearGasto).toHaveBeenCalledWith(expect.objectContaining({ fechaGasto: "2026-10-12" }));
  });

  it("acepta un gasto de hoy", async () => {
    await expect(registrarGasto("viaje-1", { ...datosGasto, fecha: HOY }, HOY)).resolves.toBeDefined();
  });

  it("rechaza una fecha futura sin tocar nada", async () => {
    const error = await registrarGasto("viaje-1", { ...datosGasto, fecha: "2026-10-15" }, HOY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorValidacion);
    expect((error as ErrorValidacion).detalles).toEqual([
      { campo: "fecha", mensaje: "La fecha del gasto no puede ser futura." },
    ]);
    expect(obtenerViaje).not.toHaveBeenCalled();
    expect(repositorio.crearGasto).not.toHaveBeenCalled();
  });

  it("no consulta cotizaciones ni guarda si el viaje está cerrado", async () => {
    vi.mocked(obtenerViaje).mockResolvedValue({ ...viaje, estado: "cerrado" });

    await expect(registrarGasto("viaje-1", datosGasto, HOY)).rejects.toBeInstanceOf(ErrorViajeCerrado);

    expect(convertir).not.toHaveBeenCalled();
    expect(repositorio.crearGasto).not.toHaveBeenCalled();
  });

  it("no guarda nada si el viaje no es del usuario", async () => {
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(registrarGasto("ajeno", datosGasto, HOY)).rejects.toBeInstanceOf(ErrorNoEncontrado);

    expect(repositorio.crearGasto).not.toHaveBeenCalled();
  });

  it("no convierte ni guarda si la categoría no existe", async () => {
    vi.mocked(obtenerCategoriaPorNombre).mockRejectedValue(new ErrorNoEncontrado("CATEGORIA"));

    await expect(registrarGasto("viaje-1", datosGasto, HOY)).rejects.toMatchObject({ codigo: "CATEGORIA_NO_ENCONTRADO" });

    expect(convertir).not.toHaveBeenCalled();
    expect(repositorio.crearGasto).not.toHaveBeenCalled();
  });

  it("no guarda el gasto si no hay forma de conseguir la cotización", async () => {
    vi.mocked(convertir).mockRejectedValue(new ErrorCotizacionNoDisponible());

    await expect(registrarGasto("viaje-1", datosGasto, HOY)).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);

    expect(repositorio.crearGasto).not.toHaveBeenCalled();
  });

  it("pasa el aviso de la cotización desactualizada a la tarjeta", async () => {
    vi.mocked(convertir).mockResolvedValue({ ...conversion, aviso: "Usé la cotización del 12 oct 2026." });

    const registrado = await registrarGasto("viaje-1", datosGasto, HOY);

    expect(registrado.aviso).toBe("Usé la cotización del 12 oct 2026.");
  });

  it("no muestra fuente cuando la moneda del gasto es la base", async () => {
    vi.mocked(convertir).mockResolvedValue({
      ...conversion,
      monedaOriginal: "ARS",
      montoOriginal: 2000,
      montoConvertido: 2000,
      cotizacion: 1,
      fuente: null,
    });

    const registrado = await registrarGasto("viaje-1", { ...datosGasto, monto: 2000, moneda: "ARS" }, HOY);

    expect(registrado).toMatchObject({ fuente: null, cotizacion: 1, montoConvertido: 2000 });
  });

  it.each([{}, { ...datosGasto, monto: -1 }, { ...datosGasto, moneda: "pesos" }, "gasto"])(
    "rechaza datos inválidos (%j) sin tocar nada",
    async (datos) => {
      await expect(registrarGasto("viaje-1", datos, HOY)).rejects.toBeInstanceOf(ErrorValidacion);

      expect(obtenerViaje).not.toHaveBeenCalled();
      expect(repositorio.crearGasto).not.toHaveBeenCalled();
    },
  );
});

describe("eliminarGasto", () => {
  it("borra el gasto de ese viaje", async () => {
    await expect(eliminarGasto("viaje-1", ID_GASTO)).resolves.toBeUndefined();

    expect(repositorio.eliminarGasto).toHaveBeenCalledWith("viaje-1", ID_GASTO);
  });

  it("trata un id mal formado como inexistente sin consultar nada", async () => {
    await expect(eliminarGasto("viaje-1", "no-es-un-uuid")).rejects.toMatchObject({ codigo: "GASTO_NO_ENCONTRADO" });

    expect(obtenerViaje).not.toHaveBeenCalled();
    expect(repositorio.eliminarGasto).not.toHaveBeenCalled();
  });

  it("no borra nada si el viaje está cerrado", async () => {
    vi.mocked(obtenerViaje).mockResolvedValue({ ...viaje, estado: "cerrado" });

    await expect(eliminarGasto("viaje-1", ID_GASTO)).rejects.toBeInstanceOf(ErrorViajeCerrado);

    expect(repositorio.eliminarGasto).not.toHaveBeenCalled();
  });

  it("lanza ErrorNoEncontrado si el gasto no existe o es de otro usuario", async () => {
    vi.mocked(repositorio.eliminarGasto).mockResolvedValue(false);

    await expect(eliminarGasto("viaje-1", ID_GASTO)).rejects.toMatchObject({ codigo: "GASTO_NO_ENCONTRADO" });
  });

  it("no borra nada si el viaje no es del usuario", async () => {
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(eliminarGasto("ajeno", ID_GASTO)).rejects.toMatchObject({ codigo: "VIAJE_NO_ENCONTRADO" });

    expect(repositorio.eliminarGasto).not.toHaveBeenCalled();
  });
});

describe("eliminarUltimoGasto", () => {
  const ultimo: Gasto = {
    id: ID_GASTO,
    viajeId: "viaje-1",
    montoOriginal: 15000,
    monedaOriginal: "CLP",
    montoConvertido: 21750,
    cotizacion: 1.45,
    fechaCotizacion: HOY,
    categoriaId: "c-1",
    descripcion: "Cena",
    fechaGasto: HOY,
    creadoEn: "2026-10-14T21:00:00Z",
  };

  beforeEach(() => {
    vi.mocked(repositorio.obtenerUltimoGasto).mockResolvedValue(ultimo);
  });

  it("borra el gasto más reciente y devuelve lo necesario para confirmarlo", async () => {
    const eliminado = await eliminarUltimoGasto("viaje-1");

    expect(repositorio.eliminarGasto).toHaveBeenCalledWith("viaje-1", ID_GASTO);
    expect(eliminado).toEqual({
      id: ID_GASTO,
      descripcion: "Cena",
      fechaGasto: HOY,
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      monedaBase: "ARS",
    });
  });

  it("lanza ErrorNoEncontrado si el viaje no tiene gastos", async () => {
    vi.mocked(repositorio.obtenerUltimoGasto).mockResolvedValue(null);

    await expect(eliminarUltimoGasto("viaje-1")).rejects.toMatchObject({ codigo: "GASTO_NO_ENCONTRADO" });
    expect(repositorio.eliminarGasto).not.toHaveBeenCalled();
  });

  it("no borra nada si el viaje está cerrado", async () => {
    vi.mocked(obtenerViaje).mockResolvedValue({ ...viaje, estado: "cerrado" });

    await expect(eliminarUltimoGasto("viaje-1")).rejects.toBeInstanceOf(ErrorViajeCerrado);
    expect(repositorio.obtenerUltimoGasto).not.toHaveBeenCalled();
  });

  it("lanza ErrorNoEncontrado si el gasto ya no estaba cuando se quiso borrar", async () => {
    vi.mocked(repositorio.eliminarGasto).mockResolvedValue(false);

    await expect(eliminarUltimoGasto("viaje-1")).rejects.toMatchObject({ codigo: "GASTO_NO_ENCONTRADO" });
  });
});

describe("obtenerIdsGastosEliminados", () => {
  const ID_2 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

  it("devuelve los gastos mostrados que ya no existen", async () => {
    vi.mocked(repositorio.listarIdsExistentes).mockResolvedValue([ID_GASTO]);

    await expect(obtenerIdsGastosEliminados("viaje-1", [ID_GASTO, ID_2])).resolves.toEqual([ID_2]);

    expect(repositorio.listarIdsExistentes).toHaveBeenCalledWith("viaje-1", [ID_GASTO, ID_2]);
  });

  it("devuelve vacío si todos siguen existiendo", async () => {
    vi.mocked(repositorio.listarIdsExistentes).mockResolvedValue([ID_GASTO, ID_2]);

    await expect(obtenerIdsGastosEliminados("viaje-1", [ID_GASTO, ID_2])).resolves.toEqual([]);
  });

  it("no consulta la base si no hay ids, y no repite ni consulta los que no son uuid", async () => {
    vi.mocked(repositorio.listarIdsExistentes).mockResolvedValue([]);

    await expect(obtenerIdsGastosEliminados("viaje-1", [])).resolves.toEqual([]);
    await expect(obtenerIdsGastosEliminados("viaje-1", ["no-es-uuid"])).resolves.toEqual([]);
    expect(repositorio.listarIdsExistentes).not.toHaveBeenCalled();

    await obtenerIdsGastosEliminados("viaje-1", [ID_GASTO, ID_GASTO, "no-es-uuid"]);
    expect(repositorio.listarIdsExistentes).toHaveBeenCalledWith("viaje-1", [ID_GASTO]);
  });
});
