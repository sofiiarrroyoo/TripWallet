import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ErrorCotizacionNoDisponible,
  ErrorGastosModificados,
  ErrorNoEncontrado,
  ErrorViajeAbierto,
  ErrorViajeCerrado,
  ErrorViajeSinGastos,
} from "@/errores";
import * as repositorioGastos from "@/repositorios/gastos";
import * as repositorio from "@/repositorios/resumenesViaje";
import type { FotoCotizaciones, ResumenViaje } from "@/tipos/cierre";
import type { GastoDelViaje, Presupuesto } from "@/tipos/resumen";
import type { Viaje } from "@/tipos/viaje";
import { cerrarViaje, obtenerResumenViaje, reabrirViaje } from "./cierreViaje";
import { obtenerFotoCotizaciones } from "./fotoCotizaciones";
import { obtenerPresupuesto } from "./presupuestos";
import { generarResumen } from "./resumenCierre";
import { obtenerViaje } from "./viajes";

vi.mock("@/repositorios/gastos");
vi.mock("@/repositorios/resumenesViaje");
vi.mock("./viajes");
vi.mock("./presupuestos");
vi.mock("./fotoCotizaciones");
vi.mock("./resumenCierre");

const viaje: Viaje = {
  id: "viaje-1",
  nombre: "Vacaciones en Chile",
  destino: "Santiago",
  monedaBase: "ARS",
  fechaInicio: "2026-10-10",
  fechaFin: "2026-10-19",
  presupuestoTotal: null,
  estado: "abierto",
  creadoEn: "2026-10-01T12:00:00Z",
};

function gasto(id: string, montoConvertido: number): GastoDelViaje {
  return {
    id,
    descripcion: `Gasto ${id}`,
    categoria: "Comida y bebida",
    fechaGasto: "2026-10-12",
    montoOriginal: montoConvertido,
    monedaOriginal: "ARS",
    montoConvertido,
    cotizacion: 1,
    fechaCotizacion: "2026-10-12",
    creadoEn: "2026-10-12T12:00:00Z",
  };
}

const foto: FotoCotizaciones = {
  monedaBase: "USD",
  fecha: "2026-10-15",
  fuente: "ExchangeRate-API (open.er-api.com)",
  tasas: { ARS: 1450 },
  desactualizada: false,
};

const resumenGuardado: ResumenViaje = {
  viajeId: "viaje-1",
  estadisticas: {
    monedaBase: "ARS",
    total: 3000,
    cantidadGastos: 2,
    diasDelViaje: 10,
    promedioPorDia: 300,
    porCategoria: [],
    gastosMasGrandes: [],
    presupuesto: null,
  },
  cotizacionesCierre: foto,
  resumen: "Titular\n\n- Uno\n- Dos",
  creadoEn: "2026-10-15T12:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(obtenerViaje).mockResolvedValue(viaje);
  vi.mocked(obtenerFotoCotizaciones).mockResolvedValue(foto);
  vi.mocked(obtenerPresupuesto).mockResolvedValue(null);
  vi.mocked(repositorioGastos.listarGastosDelViaje).mockResolvedValue([gasto("g-1", 1000), gasto("g-2", 2000)]);
  vi.mocked(generarResumen).mockResolvedValue("Titular\n\n- Uno\n- Dos");
  vi.mocked(repositorio.cerrarViaje).mockResolvedValue(undefined);
  vi.mocked(repositorio.obtenerResumen).mockResolvedValue(resumenGuardado);
});

describe("cerrarViaje", () => {
  it("calcula las estadísticas, arma el resumen, cierra con los ids de los gastos y devuelve el resumen guardado", async () => {
    await expect(cerrarViaje("viaje-1")).resolves.toBe(resumenGuardado);

    expect(repositorio.cerrarViaje).toHaveBeenCalledWith({
      viajeId: "viaje-1",
      gastosIds: ["g-1", "g-2"],
      estadisticas: expect.objectContaining({ total: 3000, cantidadGastos: 2, promedioPorDia: 300 }),
      cotizacionesCierre: foto,
      resumen: "Titular\n\n- Uno\n- Dos",
    });
    expect(obtenerFotoCotizaciones).toHaveBeenCalledWith("ARS");
  });

  it("le pasa el presupuesto a las estadísticas para comparar lo planificado contra lo real", async () => {
    const presupuesto: Presupuesto = { total: 5000, origen: "total", porCategoria: [] };
    vi.mocked(obtenerPresupuesto).mockResolvedValue(presupuesto);

    await cerrarViaje("viaje-1");

    expect(repositorio.cerrarViaje).toHaveBeenCalledWith(
      expect.objectContaining({
        estadisticas: expect.objectContaining({
          presupuesto: expect.objectContaining({ total: 5000, gastado: 3000, restante: 2000 }),
        }),
      }),
    );
  });

  it("cierra igual si el modelo no pudo generar el resumen", async () => {
    vi.mocked(generarResumen).mockResolvedValue(null);

    await cerrarViaje("viaje-1");

    expect(repositorio.cerrarViaje).toHaveBeenCalledWith(expect.objectContaining({ resumen: null }));
  });

  it("no cierra un viaje que ya está cerrado", async () => {
    vi.mocked(obtenerViaje).mockResolvedValue({ ...viaje, estado: "cerrado" });

    await expect(cerrarViaje("viaje-1")).rejects.toBeInstanceOf(ErrorViajeCerrado);

    expect(obtenerFotoCotizaciones).not.toHaveBeenCalled();
    expect(repositorio.cerrarViaje).not.toHaveBeenCalled();
  });

  it("no cierra un viaje sin gastos y no gasta una llamada al modelo", async () => {
    vi.mocked(repositorioGastos.listarGastosDelViaje).mockResolvedValue([]);

    await expect(cerrarViaje("viaje-1")).rejects.toBeInstanceOf(ErrorViajeSinGastos);

    expect(generarResumen).not.toHaveBeenCalled();
    expect(repositorio.cerrarViaje).not.toHaveBeenCalled();
  });

  it("no cierra si no hay cotizaciones, ni llama al modelo", async () => {
    vi.mocked(obtenerFotoCotizaciones).mockRejectedValue(new ErrorCotizacionNoDisponible());

    await expect(cerrarViaje("viaje-1")).rejects.toBeInstanceOf(ErrorCotizacionNoDisponible);

    expect(generarResumen).not.toHaveBeenCalled();
    expect(repositorio.cerrarViaje).not.toHaveBeenCalled();
  });

  it("propaga que el viaje no existe o es de otra persona", async () => {
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(cerrarViaje("ajeno")).rejects.toBeInstanceOf(ErrorNoEncontrado);
  });

  it("si cambiaron los gastos mientras tanto, recalcula con los nuevos y reintenta", async () => {
    vi.mocked(repositorioGastos.listarGastosDelViaje)
      .mockResolvedValueOnce([gasto("g-1", 1000), gasto("g-2", 2000)])
      .mockResolvedValueOnce([gasto("g-1", 1000), gasto("g-2", 2000), gasto("g-3", 500)]);
    vi.mocked(repositorio.cerrarViaje).mockRejectedValueOnce(new ErrorGastosModificados());

    await cerrarViaje("viaje-1");

    expect(repositorio.cerrarViaje).toHaveBeenCalledTimes(2);
    expect(repositorio.cerrarViaje).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gastosIds: ["g-1", "g-2", "g-3"],
        estadisticas: expect.objectContaining({ total: 3500, cantidadGastos: 3 }),
      }),
    );
    // La foto de cotizaciones se toma una sola vez.
    expect(obtenerFotoCotizaciones).toHaveBeenCalledTimes(1);
  });

  it("si los gastos siguen cambiando después de 3 intentos, avisa que se vuelva a intentar", async () => {
    vi.mocked(repositorio.cerrarViaje).mockRejectedValue(new ErrorGastosModificados());

    await expect(cerrarViaje("viaje-1")).rejects.toBeInstanceOf(ErrorGastosModificados);

    expect(repositorio.cerrarViaje).toHaveBeenCalledTimes(3);
  });

  it("si un reintento deja el viaje sin gastos, avisa que no hay nada para resumir", async () => {
    vi.mocked(repositorioGastos.listarGastosDelViaje)
      .mockResolvedValueOnce([gasto("g-1", 1000)])
      .mockResolvedValueOnce([]);
    vi.mocked(repositorio.cerrarViaje).mockRejectedValueOnce(new ErrorGastosModificados());

    await expect(cerrarViaje("viaje-1")).rejects.toBeInstanceOf(ErrorViajeSinGastos);
  });

  it("no reintenta ante otros errores de la base", async () => {
    const caida = new Error("sin conexión");
    vi.mocked(repositorio.cerrarViaje).mockRejectedValue(caida);

    await expect(cerrarViaje("viaje-1")).rejects.toBe(caida);

    expect(repositorio.cerrarViaje).toHaveBeenCalledTimes(1);
  });

  it("falla si después de cerrar no encuentra el resumen guardado", async () => {
    vi.mocked(repositorio.obtenerResumen).mockResolvedValue(null);

    await expect(cerrarViaje("viaje-1")).rejects.toThrow(/resumen/);
  });
});

describe("reabrirViaje", () => {
  it("reabre el viaje", async () => {
    vi.mocked(repositorio.reabrirViaje).mockResolvedValue(undefined);

    await reabrirViaje("viaje-1");

    expect(repositorio.reabrirViaje).toHaveBeenCalledWith("viaje-1");
  });

  it("propaga que el viaje ya estaba abierto", async () => {
    vi.mocked(repositorio.reabrirViaje).mockRejectedValue(new ErrorViajeAbierto());

    await expect(reabrirViaje("viaje-1")).rejects.toBeInstanceOf(ErrorViajeAbierto);
  });

  it("no toca la base si el viaje no es de la persona", async () => {
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(reabrirViaje("ajeno")).rejects.toBeInstanceOf(ErrorNoEncontrado);

    expect(repositorio.reabrirViaje).not.toHaveBeenCalled();
  });
});

describe("obtenerResumenViaje", () => {
  it("devuelve el resumen del viaje cerrado", async () => {
    await expect(obtenerResumenViaje("viaje-1")).resolves.toBe(resumenGuardado);

    expect(repositorio.obtenerResumen).toHaveBeenCalledWith("viaje-1");
  });

  it("devuelve null si el viaje está abierto", async () => {
    vi.mocked(repositorio.obtenerResumen).mockResolvedValue(null);

    await expect(obtenerResumenViaje("viaje-1")).resolves.toBeNull();
  });

  it("no lee nada de un viaje que no es de la persona", async () => {
    vi.mocked(obtenerViaje).mockRejectedValue(new ErrorNoEncontrado("VIAJE"));

    await expect(obtenerResumenViaje("ajeno")).rejects.toBeInstanceOf(ErrorNoEncontrado);

    expect(repositorio.obtenerResumen).not.toHaveBeenCalled();
  });
});
