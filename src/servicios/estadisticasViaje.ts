import { diasEntre } from "@/lib/fechas";
import { redondearADosDecimales } from "@/lib/numeros";
import type { EstadisticasViaje, GastoMayor } from "@/tipos/cierre";
import type { GastoDelViaje, Presupuesto } from "@/tipos/resumen";
import type { Viaje } from "@/tipos/viaje";
import { compararConPresupuesto, resumirGastos } from "./resumenGastos";

export const CANTIDAD_GASTOS_MAS_GRANDES = 5;

function aGastoMayor(gasto: GastoDelViaje): GastoMayor {
  return {
    id: gasto.id,
    descripcion: gasto.descripcion,
    categoria: gasto.categoria,
    fechaGasto: gasto.fechaGasto,
    montoOriginal: gasto.montoOriginal,
    monedaOriginal: gasto.monedaOriginal,
    montoConvertido: gasto.montoConvertido,
  };
}

// A igual monto, el que se cargó primero: así el resultado no depende del orden en que vengan los gastos.
function masGrandesPrimero(a: GastoDelViaje, b: GastoDelViaje): number {
  return b.montoConvertido - a.montoConvertido || a.creadoEn.localeCompare(b.creadoEn) || a.id.localeCompare(b.id);
}

// Las estadísticas que se guardan al cerrar un viaje. Cálculo puro (sin base ni API), reutilizando los de la consulta del
// chat: los números los saca el código y el modelo solo los cuenta. El promedio por día es el total sobre los días del
// viaje (de inicio a fin), no sobre los días en que hubo gastos.
export function calcularEstadisticas(
  viaje: Viaje,
  gastos: GastoDelViaje[],
  presupuesto: Presupuesto | null,
): EstadisticasViaje {
  const resumen = resumirGastos(gastos);
  const diasDelViaje = diasEntre(viaje.fechaInicio, viaje.fechaFin);

  return {
    monedaBase: viaje.monedaBase,
    total: resumen.total,
    cantidadGastos: resumen.cantidad,
    diasDelViaje,
    promedioPorDia: redondearADosDecimales(resumen.total / diasDelViaje),
    porCategoria: resumen.porCategoria,
    gastosMasGrandes: [...gastos].sort(masGrandesPrimero).slice(0, CANTIDAD_GASTOS_MAS_GRANDES).map(aGastoMayor),
    presupuesto: presupuesto ? compararConPresupuesto(presupuesto, gastos) : null,
  };
}
