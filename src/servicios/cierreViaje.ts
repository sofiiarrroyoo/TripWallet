import { ErrorGastosModificados, ErrorViajeCerrado, ErrorViajeSinGastos } from "@/errores";
import * as repositorioGastos from "@/repositorios/gastos";
import * as repositorio from "@/repositorios/resumenesViaje";
import type { ResumenViaje } from "@/tipos/cierre";
import { calcularEstadisticas } from "./estadisticasViaje";
import { obtenerFotoCotizaciones } from "./fotoCotizaciones";
import { obtenerPresupuesto } from "./presupuestos";
import { generarResumen } from "./resumenCierre";
import { obtenerViaje } from "./viajes";

// Cuántas veces se recalcula si, mientras se armaba el resumen, se agregó o borró un gasto.
const MAXIMO_INTENTOS = 3;

// Cierra un viaje: calcula las estadísticas (en TypeScript, reutilizando los cálculos de la consulta del chat), toma la
// foto de las cotizaciones del día, le pide al modelo un resumen breve y recién entonces llama a la función de Postgres
// que cambia el estado y guarda todo en una transacción. La función comprueba que los gastos usados sigan siendo todos
// los del viaje: si no, se recalcula y se reintenta. Sin cotizaciones no se cierra; sin resumen del modelo, sí.
export async function cerrarViaje(viajeId: string): Promise<ResumenViaje> {
  const viaje = await obtenerViaje(viajeId);
  if (viaje.estado === "cerrado") throw new ErrorViajeCerrado();

  const cotizacionesCierre = await obtenerFotoCotizaciones(viaje.monedaBase);

  for (let intento = 1; intento <= MAXIMO_INTENTOS; intento += 1) {
    const gastos = await repositorioGastos.listarGastosDelViaje(viaje.id);
    if (gastos.length === 0) throw new ErrorViajeSinGastos();

    const estadisticas = calcularEstadisticas(viaje, gastos, await obtenerPresupuesto(viaje));
    const resumen = await generarResumen(viaje, estadisticas);

    try {
      await repositorio.cerrarViaje({
        viajeId: viaje.id,
        gastosIds: gastos.map((gasto) => gasto.id),
        estadisticas,
        cotizacionesCierre,
        resumen,
      });
    } catch (error) {
      if (error instanceof ErrorGastosModificados) continue;
      throw error;
    }

    const guardado = await repositorio.obtenerResumen(viaje.id);
    if (!guardado) throw new Error("El viaje se cerró pero no se encontró su resumen");
    return guardado;
  }

  throw new ErrorGastosModificados();
}

// Al reabrir se borra el resumen; al volver a cerrar se genera uno nuevo.
export async function reabrirViaje(viajeId: string): Promise<void> {
  const viaje = await obtenerViaje(viajeId);
  await repositorio.reabrirViaje(viaje.id);
}

// null si el viaje está abierto (el resumen solo existe mientras está cerrado).
export async function obtenerResumenViaje(viajeId: string): Promise<ResumenViaje | null> {
  const viaje = await obtenerViaje(viajeId);
  return repositorio.obtenerResumen(viaje.id);
}
