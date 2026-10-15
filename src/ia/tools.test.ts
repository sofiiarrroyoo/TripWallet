import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorCategoriaDuplicada,
  ErrorCotizacionNoDisponible,
  ErrorNoEncontrado,
  ErrorValidacion,
  ErrorViajeCerrado,
  ErrorViajeSinGastos,
} from "@/errores";
import { crearCategoria, listarCategorias } from "@/servicios/categorias";
import { cerrarViaje } from "@/servicios/cierreViaje";
import { consultarGastos } from "@/servicios/consultaGastos";
import { convertir } from "@/servicios/cotizaciones";
import { eliminarUltimoGasto, registrarGasto } from "@/servicios/gastos";
import type { GastoRegistrado } from "@/tipos/gasto";
import type { ConsultaGastos } from "@/tipos/resumen";
import { contextoDeTools, tools } from "./tools";

vi.mock("@/servicios/categorias");
vi.mock("@/servicios/cierreViaje");
vi.mock("@/servicios/consultaGastos");
vi.mock("@/servicios/cotizaciones");
vi.mock("@/servicios/gastos");

const contexto = { viajeId: "viaje-1", monedaBase: "ARS", hoy: "2026-10-14" };

// El SDK le pasa a cada tool sus opciones de ejecución (id de la llamada, mensajes, contexto del servidor).
const opciones = { toolCallId: "llamada-1", messages: [], context: contexto } as never;

const gasto: GastoRegistrado = {
  id: "g-1",
  descripcion: "Cena",
  categoria: "Comida y bebida",
  fechaGasto: "2026-10-14",
  montoOriginal: 15000,
  monedaOriginal: "CLP",
  montoConvertido: 21750,
  monedaBase: "ARS",
  cotizacion: 1.45,
  fechaCotizacion: "2026-10-14",
  fuente: "ExchangeRate-API (open.er-api.com)",
  aviso: null,
};

const entradaGasto = { monto: 15000, moneda: "CLP", categoria: "Comida y bebida", descripcion: "Cena" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("registrar_gasto", () => {
  it("registra el gasto en el viaje y con la fecha de hoy que puso el servidor", async () => {
    vi.mocked(registrarGasto).mockResolvedValue(gasto);

    const resultado = await tools.registrar_gasto.execute!(entradaGasto, opciones);

    expect(registrarGasto).toHaveBeenCalledWith("viaje-1", entradaGasto, "2026-10-14");
    expect(resultado).toEqual({ ok: true, gasto });
  });

  it("devuelve la falla de validación con sus detalles para que el bot la explique", async () => {
    vi.mocked(registrarGasto).mockRejectedValue(
      new ErrorValidacion(undefined, [{ campo: "fecha", mensaje: "La fecha del gasto no puede ser futura." }]),
    );

    const resultado = await tools.registrar_gasto.execute!(entradaGasto, opciones);

    expect(resultado).toEqual({
      ok: false,
      codigo: "VALIDACION",
      mensaje: "Los datos enviados no son válidos.",
      detalles: [{ campo: "fecha", mensaje: "La fecha del gasto no puede ser futura." }],
    });
  });

  it("si la categoría no existe, devuelve las que sí se pueden usar", async () => {
    vi.mocked(registrarGasto).mockRejectedValue(new ErrorNoEncontrado("CATEGORIA"));
    vi.mocked(listarCategorias).mockResolvedValue([
      { id: "c-1", nombre: "Comida y bebida", esPorDefecto: true },
      { id: "c-2", nombre: "Souvenirs", esPorDefecto: false },
    ]);

    const resultado = await tools.registrar_gasto.execute!(entradaGasto, opciones);

    expect(resultado).toMatchObject({
      ok: false,
      codigo: "CATEGORIA_NO_ENCONTRADO",
      categoriasDisponibles: ["Comida y bebida", "Souvenirs"],
    });
  });

  it("devuelve la falla igual si tampoco se pudo leer la lista de categorías", async () => {
    vi.mocked(registrarGasto).mockRejectedValue(new ErrorNoEncontrado("CATEGORIA"));
    vi.mocked(listarCategorias).mockRejectedValue(new Error("base caída"));

    const resultado = await tools.registrar_gasto.execute!(entradaGasto, opciones);

    expect(resultado).toMatchObject({ ok: false, codigo: "CATEGORIA_NO_ENCONTRADO" });
  });

  it.each([
    [new ErrorViajeCerrado(), "VIAJE_CERRADO"],
    [new ErrorCotizacionNoDisponible(), "COTIZACION_NO_DISPONIBLE"],
  ])("traduce %o a un resultado con el código %s", async (error, codigo) => {
    vi.mocked(registrarGasto).mockRejectedValue(error);

    const resultado = await tools.registrar_gasto.execute!(entradaGasto, opciones);

    expect(resultado).toMatchObject({ ok: false, codigo, mensaje: error.message });
  });

  it("no filtra los detalles de un error inesperado", async () => {
    vi.mocked(registrarGasto).mockRejectedValue(new Error("password=123 en la conexión"));

    const resultado = await tools.registrar_gasto.execute!(entradaGasto, opciones);

    expect(resultado).toEqual({
      ok: false,
      codigo: "ERROR_INTERNO",
      mensaje: "No pude completar la acción por un problema interno.",
    });
  });
});

describe("consultar_gastos", () => {
  const consulta: ConsultaGastos = {
    monedaBase: "ARS",
    filtro: { categoria: null, desde: null, hasta: null },
    resumen: {
      total: 36750,
      cantidad: 1,
      porCategoria: [{ categoria: "Comida y bebida", total: 36750, cantidad: 1, porcentajeDelTotal: 100 }],
      porDia: [{ fecha: "2026-10-14", total: 36750, cantidad: 1 }],
    },
    gastos: [],
    hayMasGastos: false,
    presupuesto: null,
    fuenteCotizaciones: "ExchangeRate-API (open.er-api.com)",
  };

  it("consulta el viaje del servidor con los filtros del bot y devuelve los números ya formateados", async () => {
    vi.mocked(consultarGastos).mockResolvedValue(consulta);
    const filtros = { categoria: "Comida y bebida", desde: "2026-10-14", hasta: "2026-10-14" };

    const resultado = await tools.consultar_gastos.execute!(filtros, opciones);

    expect(consultarGastos).toHaveBeenCalledWith("viaje-1", filtros);
    expect(resultado).toMatchObject({ ok: true, consulta: { monedaBase: "ARS", cantidadDeGastos: 1 } });
    expect((resultado as { consulta: { total: string } }).consulta.total.replace(/\s/g, " ")).toBe("ARS 36.750,00");
  });

  it("acepta una consulta sin filtros", async () => {
    vi.mocked(consultarGastos).mockResolvedValue(consulta);

    await tools.consultar_gastos.execute!({}, opciones);

    expect(consultarGastos).toHaveBeenCalledWith("viaje-1", {});
  });

  it("si la categoría no existe, devuelve las que sí se pueden usar", async () => {
    vi.mocked(consultarGastos).mockRejectedValue(new ErrorNoEncontrado("CATEGORIA"));
    vi.mocked(listarCategorias).mockResolvedValue([{ id: "c-1", nombre: "Comida y bebida", esPorDefecto: true }]);

    const resultado = await tools.consultar_gastos.execute!({ categoria: "Mascotas" }, opciones);

    expect(resultado).toMatchObject({
      ok: false,
      codigo: "CATEGORIA_NO_ENCONTRADO",
      categoriasDisponibles: ["Comida y bebida"],
    });
  });

  it("devuelve la falla de validación si el rango está al revés", async () => {
    vi.mocked(consultarGastos).mockRejectedValue(
      new ErrorValidacion(undefined, [{ campo: "hasta", mensaje: "La fecha 'hasta' no puede ser anterior a 'desde'." }]),
    );

    const resultado = await tools.consultar_gastos.execute!({ desde: "2026-10-14", hasta: "2026-10-12" }, opciones);

    expect(resultado).toMatchObject({ ok: false, codigo: "VALIDACION", detalles: [{ campo: "hasta" }] });
  });
});

describe("convertir_moneda", () => {
  const conversion = {
    montoOriginal: 100,
    monedaOriginal: "USD",
    montoConvertido: 145000,
    monedaBase: "ARS",
    cotizacion: 1450,
    fechaCotizacion: "2026-10-14",
    fuente: "ExchangeRate-API (open.er-api.com)",
    aviso: null,
  };

  it("convierte a la moneda base del viaje si no se indica destino", async () => {
    vi.mocked(convertir).mockResolvedValue(conversion);

    const resultado = await tools.convertir_moneda.execute!({ monto: 100, monedaOrigen: "USD" }, opciones);

    expect(convertir).toHaveBeenCalledWith({ monto: 100, monedaOriginal: "USD", monedaBase: "ARS" });
    expect(resultado).toEqual({ ok: true, conversion });
  });

  it("convierte a la moneda de destino pedida", async () => {
    vi.mocked(convertir).mockResolvedValue({ ...conversion, monedaBase: "CLP" });

    await tools.convertir_moneda.execute!({ monto: 100, monedaOrigen: "USD", monedaDestino: "CLP" }, opciones);

    expect(convertir).toHaveBeenCalledWith({ monto: 100, monedaOriginal: "USD", monedaBase: "CLP" });
  });

  it("devuelve la falla si no hay cotización", async () => {
    vi.mocked(convertir).mockRejectedValue(new ErrorCotizacionNoDisponible());

    const resultado = await tools.convertir_moneda.execute!({ monto: 100, monedaOrigen: "USD" }, opciones);

    expect(resultado).toMatchObject({ ok: false, codigo: "COTIZACION_NO_DISPONIBLE" });
  });
});

describe("eliminar_gasto", () => {
  it("elimina el último gasto del viaje y devuelve cuál era", async () => {
    const eliminado = {
      id: "g-1",
      descripcion: "Cena",
      fechaGasto: "2026-10-14",
      montoOriginal: 15000,
      monedaOriginal: "CLP",
      montoConvertido: 21750,
      monedaBase: "ARS",
    };
    vi.mocked(eliminarUltimoGasto).mockResolvedValue(eliminado);

    const resultado = await tools.eliminar_gasto.execute!({}, opciones);

    expect(eliminarUltimoGasto).toHaveBeenCalledWith("viaje-1");
    expect(resultado).toEqual({ ok: true, gasto: eliminado });
  });

  it("devuelve la falla si el viaje no tiene gastos", async () => {
    vi.mocked(eliminarUltimoGasto).mockRejectedValue(new ErrorNoEncontrado("GASTO"));

    const resultado = await tools.eliminar_gasto.execute!({}, opciones);

    expect(resultado).toMatchObject({ ok: false, codigo: "GASTO_NO_ENCONTRADO" });
  });
});

describe("crear_categoria", () => {
  it("crea la categoría", async () => {
    const categoria = { id: "c-9", nombre: "Souvenirs", esPorDefecto: false };
    vi.mocked(crearCategoria).mockResolvedValue(categoria);

    const resultado = await tools.crear_categoria.execute!({ nombre: "Souvenirs" }, opciones);

    expect(crearCategoria).toHaveBeenCalledWith({ nombre: "Souvenirs" });
    expect(resultado).toEqual({ ok: true, categoria });
  });

  it("devuelve la falla si ya existe una igual, nombrando la que está", async () => {
    vi.mocked(crearCategoria).mockRejectedValue(new ErrorCategoriaDuplicada("Compras"));

    const resultado = await tools.crear_categoria.execute!({ nombre: "compras" }, opciones);

    expect(resultado).toMatchObject({
      ok: false,
      codigo: "CATEGORIA_DUPLICADA",
      mensaje: 'Ya existe una categoría llamada "Compras".',
    });
  });
});

describe("cerrar_viaje", () => {
  const resumenGuardado = {
    viajeId: "viaje-1",
    estadisticas: {
      monedaBase: "ARS",
      total: 53000,
      cantidadGastos: 5,
      diasDelViaje: 10,
      promedioPorDia: 5300,
      porCategoria: [],
      gastosMasGrandes: [],
      presupuesto: null,
    },
    cotizacionesCierre: {
      monedaBase: "USD",
      fecha: "2026-10-15",
      fuente: "ExchangeRate-API (open.er-api.com)",
      tasas: { ARS: 1450 },
      desactualizada: false,
    },
    resumen: "Titular\n\n- Uno\n- Dos",
    creadoEn: "2026-10-15T12:00:00Z",
  };

  it("cierra el viaje del servidor y devuelve los números ya formateados con el texto del resumen", async () => {
    vi.mocked(cerrarViaje).mockResolvedValue(resumenGuardado);

    const resultado = await tools.cerrar_viaje.execute!({}, opciones);

    expect(cerrarViaje).toHaveBeenCalledWith("viaje-1");
    expect(resultado).toMatchObject({
      ok: true,
      resumen: { total: "ARS 53.000,00", cantidadDeGastos: 5, resumenEscrito: "Titular\n\n- Uno\n- Dos" },
    });
  });

  it("no le pasa al modelo la foto de cotizaciones ni los ids", async () => {
    vi.mocked(cerrarViaje).mockResolvedValue(resumenGuardado);

    const texto = JSON.stringify(await tools.cerrar_viaje.execute!({}, opciones));

    expect(texto).not.toContain("tasas");
    expect(texto).not.toContain("viajeId");
  });

  it("devuelve la falla si el viaje no tiene gastos, para que el bot la explique", async () => {
    vi.mocked(cerrarViaje).mockRejectedValue(new ErrorViajeSinGastos());

    const resultado = await tools.cerrar_viaje.execute!({}, opciones);

    expect(resultado).toMatchObject({ ok: false, codigo: "VIAJE_SIN_GASTOS" });
  });

  it("devuelve la falla si el viaje ya estaba cerrado", async () => {
    vi.mocked(cerrarViaje).mockRejectedValue(new ErrorViajeCerrado());

    await expect(tools.cerrar_viaje.execute!({}, opciones)).resolves.toMatchObject({
      ok: false,
      codigo: "VIAJE_CERRADO",
    });
  });

  it("devuelve la falla si no hay cotizaciones", async () => {
    vi.mocked(cerrarViaje).mockRejectedValue(new ErrorCotizacionNoDisponible());

    await expect(tools.cerrar_viaje.execute!({}, opciones)).resolves.toMatchObject({
      ok: false,
      codigo: "COTIZACION_NO_DISPONIBLE",
    });
  });

  it("cierra siempre el viaje del contexto, aunque el modelo mande otro id", async () => {
    vi.mocked(cerrarViaje).mockResolvedValue(resumenGuardado);

    await tools.cerrar_viaje.execute!({ viajeId: "otro-viaje" } as never, opciones);

    expect(cerrarViaje).toHaveBeenCalledWith("viaje-1");
  });
});

describe("pedir_datos", () => {
  it("no ejecuta nada: la interfaz muestra la pregunta con sus opciones", async () => {
    const resultado = await tools.pedir_datos.execute!(
      { pregunta: "¿Qué pesos?", opciones: ["Pesos argentinos", "Pesos chilenos"] },
      opciones,
    );

    expect(resultado).toEqual({ ok: true });
  });
});

describe("contextoDeTools", () => {
  it("le da el viaje y la fecha de hoy a las tools que lo necesitan, y a ninguna otra", () => {
    expect(contextoDeTools(contexto)).toEqual({
      registrar_gasto: contexto,
      consultar_gastos: contexto,
      convertir_moneda: contexto,
      eliminar_gasto: contexto,
      cerrar_viaje: contexto,
    });
  });
});
