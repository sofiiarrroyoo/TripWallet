import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorNoEncontrado, ErrorValidacion } from "@/errores";
import { FUENTE_COTIZACIONES } from "@/integraciones/apiCotizaciones";
import * as repositorio from "@/repositorios/gastos";
import type { GastoDelViaje, Presupuesto } from "@/tipos/resumen";
import type { Viaje } from "@/tipos/viaje";
import { obtenerCategoriaPorNombre } from "./categorias";
import { MAXIMO_GASTOS_EN_DETALLE, consultarGastos } from "./consultaGastos";
import { obtenerPresupuesto } from "./presupuestos";
import { obtenerViaje } from "./viajes";

vi.mock("@/repositorios/gastos");
vi.mock("./viajes");
vi.mock("./categorias");
vi.mock("./presupuestos");

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

let contador = 0;

function gasto(categoria: string, fechaGasto: string, montoConvertido: number): GastoDelViaje {
  contador += 1;
  return {
    id: `g-${contador}`,
    descripcion: `Gasto ${contador}`,
    categoria,
    fechaGasto,
    montoOriginal: montoConvertido,
    monedaOriginal: "ARS",
    montoConvertido,
    cotizacion: 1,
    fechaCotizacion: fechaGasto,
    creadoEn: `${fechaGasto}T12:00:00Z`,
  };
}

// Del más reciente al más viejo, como los devuelve el repositorio.
const gastos = [
  gasto("Compras", "2026-10-14", 20000),
  gasto("Comida y bebida", "2026-10-14", 3000),
  gasto("Comida y bebida", "2026-10-13", 7000),
  gasto("Transporte", "2026-10-12", 8000),
  gasto("Comida y bebida", "2026-10-12", 15000),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerViaje).mockResolvedValue(viaje);
  vi.mocked(repositorio.listarGastosDelViaje).mockResolvedValue(gastos);
  vi.mocked(obtenerPresupuesto).mockResolvedValue(null);
  vi.mocked(obtenerCategoriaPorNombre).mockImplementation(async (nombre) => ({
    id: "c-1",
    nombre: String(nombre) === "comida" ? "Comida y bebida" : String(nombre),
    esPorDefecto: true,
  }));
});

describe("consultarGastos", () => {
  it("sin filtros devuelve el total, las categorías y los días de todo el viaje", async () => {
    const consulta = await consultarGastos("viaje-1", {});

    expect(consulta.monedaBase).toBe("ARS");
    expect(consulta.filtro).toEqual({ categoria: null, desde: null, hasta: null });
    expect(consulta.resumen.total).toBe(53000);
    expect(consulta.resumen.porCategoria.map((c) => c.categoria)).toEqual(["Comida y bebida", "Compras", "Transporte"]);
    expect(consulta.resumen.porDia.map((d) => d.fecha)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
    expect(consulta.gastos).toHaveLength(5);
    expect(consulta.hayMasGastos).toBe(false);
    expect(consulta.fuenteCotizaciones).toBe(FUENTE_COTIZACIONES);
  });

  it("filtra por categoría, resolviéndola contra las existentes", async () => {
    const consulta = await consultarGastos("viaje-1", { categoria: "comida" });

    expect(obtenerCategoriaPorNombre).toHaveBeenCalledWith("comida");
    expect(consulta.filtro.categoria).toBe("Comida y bebida");
    expect(consulta.resumen).toMatchObject({ total: 25000, cantidad: 3 });
    expect(consulta.gastos.map((g) => g.categoria)).toEqual(["Comida y bebida", "Comida y bebida", "Comida y bebida"]);
  });

  it("filtra por un día", async () => {
    const consulta = await consultarGastos("viaje-1", { desde: "2026-10-14", hasta: "2026-10-14" });

    expect(consulta.filtro).toEqual({ categoria: null, desde: "2026-10-14", hasta: "2026-10-14" });
    expect(consulta.resumen.total).toBe(23000);
  });

  it("combina categoría y rango de fechas", async () => {
    const consulta = await consultarGastos("viaje-1", { categoria: "comida", desde: "2026-10-13" });

    expect(consulta.resumen).toMatchObject({ total: 10000, cantidad: 2 });
  });

  it("devuelve ceros y listas vacías si nada cumple el filtro", async () => {
    const consulta = await consultarGastos("viaje-1", { desde: "2026-11-01" });

    expect(consulta.resumen).toEqual({ total: 0, cantidad: 0, porCategoria: [], porDia: [] });
    expect(consulta.gastos).toEqual([]);
  });

  it("toma null como 'sin filtro'", async () => {
    const consulta = await consultarGastos("viaje-1", { categoria: null, desde: null, hasta: null });

    expect(consulta.resumen.cantidad).toBe(5);
    expect(obtenerCategoriaPorNombre).not.toHaveBeenCalled();
  });

  describe("presupuesto", () => {
    const presupuestoTotal: Presupuesto = { total: 100000, origen: "total", porCategoria: [] };

    it("es null si el viaje no tiene presupuesto", async () => {
      await expect(consultarGastos("viaje-1", {})).resolves.toMatchObject({ presupuesto: null });
    });

    it("compara con lo gastado en todo el viaje: cuánto queda y qué porcentaje", async () => {
      vi.mocked(obtenerPresupuesto).mockResolvedValue(presupuestoTotal);

      const consulta = await consultarGastos("viaje-1", {});

      expect(consulta.presupuesto).toMatchObject({ total: 100000, gastado: 53000, restante: 47000, porcentajeGastado: 53 });
    });

    it("no cambia con el filtro: se compara con TODO el viaje, no con lo filtrado", async () => {
      vi.mocked(obtenerPresupuesto).mockResolvedValue(presupuestoTotal);

      const consulta = await consultarGastos("viaje-1", { categoria: "comida" });

      expect(consulta.resumen.total).toBe(25000);
      expect(consulta.presupuesto).toMatchObject({ gastado: 53000, restante: 47000 });
    });

    it("con presupuesto por categoría, trae el avance de cada una", async () => {
      vi.mocked(obtenerPresupuesto).mockResolvedValue({
        total: 30000,
        origen: "categorias",
        porCategoria: [{ categoria: "Comida y bebida", monto: 30000 }],
      });

      const consulta = await consultarGastos("viaje-1", {});

      expect(consulta.presupuesto?.porCategoria).toEqual([
        { categoria: "Comida y bebida", presupuesto: 30000, gastado: 25000, restante: 5000, porcentajeGastado: 83.3 },
      ]);
    });
  });

  describe("detalle de gastos", () => {
    it("lista como máximo 50, pero los totales incluyen todos", async () => {
      const muchos = Array.from({ length: MAXIMO_GASTOS_EN_DETALLE + 10 }, () => gasto("Compras", "2026-10-14", 100));
      vi.mocked(repositorio.listarGastosDelViaje).mockResolvedValue(muchos);

      const consulta = await consultarGastos("viaje-1", {});

      expect(consulta.gastos).toHaveLength(MAXIMO_GASTOS_EN_DETALLE);
      expect(consulta.hayMasGastos).toBe(true);
      expect(consulta.resumen).toMatchObject({ cantidad: 60, total: 6000 });
    });

    it("en el detalle quedan los más recientes", async () => {
      const consulta = await consultarGastos("viaje-1", {});

      expect(consulta.gastos[0]).toMatchObject({ categoria: "Compras", fechaGasto: "2026-10-14" });
    });
  });

  describe("errores", () => {
    it("rechaza un rango al revés sin consultar nada", async () => {
      const error = await consultarGastos("viaje-1", { desde: "2026-10-14", hasta: "2026-10-12" }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(ErrorValidacion);
      expect(obtenerViaje).not.toHaveBeenCalled();
      expect(repositorio.listarGastosDelViaje).not.toHaveBeenCalled();
    });

    it("rechaza una fecha mal formada", async () => {
      await expect(consultarGastos("viaje-1", { desde: "ayer" })).rejects.toBeInstanceOf(ErrorValidacion);
    });

    it("no lee gastos si el viaje no es del usuario", async () => {
      vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

      await expect(consultarGastos("ajeno", {})).rejects.toBeInstanceOf(ErrorNoEncontrado);
      expect(repositorio.listarGastosDelViaje).not.toHaveBeenCalled();
    });

    it("lanza ErrorNoEncontrado si la categoría no existe, sin leer gastos", async () => {
      vi.mocked(obtenerCategoriaPorNombre).mockRejectedValue(new ErrorNoEncontrado("CATEGORIA"));

      await expect(consultarGastos("viaje-1", { categoria: "Mascotas" })).rejects.toMatchObject({
        codigo: "CATEGORIA_NO_ENCONTRADO",
      });
      expect(repositorio.listarGastosDelViaje).not.toHaveBeenCalled();
    });

    it("se puede consultar un viaje cerrado", async () => {
      vi.mocked(obtenerViaje).mockResolvedValue({ ...viaje, estado: "cerrado" });

      await expect(consultarGastos("viaje-1", {})).resolves.toMatchObject({ resumen: { total: 53000 } });
    });
  });
});
