import { beforeEach, describe, expect, it, vi } from "vitest";
import * as repositorio from "@/repositorios/presupuestos";
import type { Viaje } from "@/tipos/viaje";
import { obtenerPresupuesto } from "./presupuestos";

vi.mock("@/repositorios/presupuestos");

const viaje: Viaje = {
  id: "viaje-1",
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-11-01",
  fechaFin: "2026-11-10",
  presupuestoTotal: null,
  estado: "abierto",
  creadoEn: "2026-10-14T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repositorio.listarPresupuestosPorCategoria).mockResolvedValue([]);
});

describe("obtenerPresupuesto", () => {
  it("con presupuesto por categoría, el total es la suma de las categorías", async () => {
    const porCategoria = [
      { categoria: "Comida y bebida", monto: 30000.1 },
      { categoria: "Transporte", monto: 50000.2 },
    ];
    vi.mocked(repositorio.listarPresupuestosPorCategoria).mockResolvedValue(porCategoria);

    await expect(obtenerPresupuesto(viaje)).resolves.toEqual({ total: 80000.3, origen: "categorias", porCategoria });
    expect(repositorio.listarPresupuestosPorCategoria).toHaveBeenCalledWith("viaje-1");
  });

  it("con presupuesto por categoría, ignora el presupuesto total cargado al crear el viaje", async () => {
    vi.mocked(repositorio.listarPresupuestosPorCategoria).mockResolvedValue([{ categoria: "Compras", monto: 1000 }]);

    const presupuesto = await obtenerPresupuesto({ ...viaje, presupuestoTotal: 999999 });

    expect(presupuesto).toMatchObject({ total: 1000, origen: "categorias" });
  });

  it("sin presupuesto por categoría, usa el presupuesto total del viaje", async () => {
    await expect(obtenerPresupuesto({ ...viaje, presupuestoTotal: 1500000 })).resolves.toEqual({
      total: 1500000,
      origen: "total",
      porCategoria: [],
    });
  });

  it("devuelve null si el viaje no tiene ningún presupuesto", async () => {
    await expect(obtenerPresupuesto(viaje)).resolves.toBeNull();
  });
});
