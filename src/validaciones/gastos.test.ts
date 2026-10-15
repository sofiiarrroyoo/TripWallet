import { describe, expect, it } from "vitest";
import {
  esquemaConsultarGastos,
  esquemaRegistrarGasto,
  esquemaResultadoEliminacion,
  esquemaResultadoRegistro,
} from "./gastos";

const gastoValido = { monto: 15000, moneda: "CLP", categoria: "Comida y bebida", descripcion: "Cena" };

function camposConError(datos: unknown): string[] {
  const resultado = esquemaRegistrarGasto.safeParse(datos);
  if (resultado.success) return [];
  return [...new Set(resultado.error.issues.map((issue) => issue.path.join(".")))];
}

describe("esquemaRegistrarGasto", () => {
  it("acepta un gasto sin fecha", () => {
    expect(esquemaRegistrarGasto.parse(gastoValido)).toEqual(gastoValido);
  });

  it("normaliza la moneda, la categoría y la descripción", () => {
    const gasto = esquemaRegistrarGasto.parse({
      monto: 2000,
      moneda: " ars ",
      categoria: "  Comida   y bebida ",
      descripcion: "  Choclo \t con   sal ",
      fecha: "2026-10-14",
    });

    expect(gasto).toEqual({
      monto: 2000,
      moneda: "ARS",
      categoria: "Comida y bebida",
      descripcion: "Choclo con sal",
      fecha: "2026-10-14",
    });
  });

  it.each([0, -5, 10.555, 1e13, "15000", null])("rechaza el monto %j", (monto) => {
    expect(camposConError({ ...gastoValido, monto })).toEqual(["monto"]);
  });

  it("acepta un monto con 2 decimales", () => {
    expect(camposConError({ ...gastoValido, monto: 1500.5 })).toEqual([]);
  });

  it.each(["pesos", "CL", "", "123"])("rechaza la moneda %j", (moneda) => {
    expect(camposConError({ ...gastoValido, moneda })).toEqual(["moneda"]);
  });

  it.each(["", "   ", "a".repeat(201)])("rechaza la descripción %j", (descripcion) => {
    expect(camposConError({ ...gastoValido, descripcion })).toEqual(["descripcion"]);
  });

  it("acepta una descripción de exactamente 200 caracteres", () => {
    expect(camposConError({ ...gastoValido, descripcion: "a".repeat(200) })).toEqual([]);
  });

  it("rechaza una categoría vacía", () => {
    expect(camposConError({ ...gastoValido, categoria: "  " })).toEqual(["categoria"]);
  });

  it.each(["14/10/2026", "2026-02-30", "ayer", 20261014])("rechaza la fecha %j", (fecha) => {
    expect(camposConError({ ...gastoValido, fecha })).toEqual(["fecha"]);
  });

  it("pide todos los datos obligatorios", () => {
    expect(camposConError({})).toEqual(["monto", "moneda", "categoria", "descripcion"]);
  });
});

const gastoRegistrado = {
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

describe("esquemaResultadoRegistro", () => {
  it("lee un resultado exitoso de registrar_gasto", () => {
    const resultado = esquemaResultadoRegistro.safeParse({ ok: true, gasto: gastoRegistrado });

    expect(resultado.success && resultado.data.gasto.montoConvertido).toBe(21750);
  });

  it("acepta un gasto sin conversión (fuente null)", () => {
    const resultado = esquemaResultadoRegistro.safeParse({ ok: true, gasto: { ...gastoRegistrado, fuente: null } });

    expect(resultado.success).toBe(true);
  });

  it.each([
    [{ ok: false, codigo: "VIAJE_CERRADO", mensaje: "cerrado" }],
    [{ ok: true }],
    [{ ok: true, gasto: { ...gastoRegistrado, montoConvertido: "21750" } }],
    [null],
  ])("rechaza %j", (resultado) => {
    expect(esquemaResultadoRegistro.safeParse(resultado).success).toBe(false);
  });
});

describe("esquemaResultadoEliminacion", () => {
  it("lee el id del gasto eliminado", () => {
    const resultado = esquemaResultadoEliminacion.safeParse({ ok: true, gasto: { id: "g-1", descripcion: "Cena" } });

    expect(resultado.success && resultado.data.gasto.id).toBe("g-1");
  });

  it("rechaza una eliminación que falló", () => {
    expect(esquemaResultadoEliminacion.safeParse({ ok: false, codigo: "GASTO_NO_ENCONTRADO" }).success).toBe(false);
  });
});

describe("esquemaConsultarGastos", () => {
  it("acepta una consulta sin filtros", () => {
    expect(esquemaConsultarGastos.parse({})).toEqual({ categoria: undefined, desde: undefined, hasta: undefined });
  });

  it("toma null como 'sin filtro'", () => {
    const consulta = esquemaConsultarGastos.parse({ categoria: null, desde: null, hasta: null });

    expect(consulta).toEqual({ categoria: undefined, desde: undefined, hasta: undefined });
  });

  it("normaliza el nombre de la categoría", () => {
    expect(esquemaConsultarGastos.parse({ categoria: "  Comida   y bebida " }).categoria).toBe("Comida y bebida");
  });

  it("acepta un día, un rango y un rango abierto de un lado", () => {
    expect(esquemaConsultarGastos.parse({ desde: "2026-10-14", hasta: "2026-10-14" })).toMatchObject({
      desde: "2026-10-14",
      hasta: "2026-10-14",
    });
    expect(esquemaConsultarGastos.parse({ desde: "2026-10-12", hasta: "2026-10-14" })).toBeDefined();
    expect(esquemaConsultarGastos.parse({ desde: "2026-10-12" })).toMatchObject({ desde: "2026-10-12" });
  });

  it("rechaza un rango al revés", () => {
    const resultado = esquemaConsultarGastos.safeParse({ desde: "2026-10-14", hasta: "2026-10-12" });

    expect(!resultado.success && resultado.error.issues.map((issue) => issue.path.join("."))).toEqual(["hasta"]);
  });

  it.each([
    [{ desde: "14/10/2026" }, "desde"],
    [{ hasta: "ayer" }, "hasta"],
    [{ desde: "2026-02-30" }, "desde"],
    [{ categoria: "   " }, "categoria"],
    [{ categoria: 42 }, "categoria"],
  ])("rechaza %j", (datos, campo) => {
    const resultado = esquemaConsultarGastos.safeParse(datos);

    expect(!resultado.success && resultado.error.issues.map((issue) => issue.path.join("."))).toContain(campo);
  });
});
