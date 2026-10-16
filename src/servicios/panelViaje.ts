import * as repositorio from "@/repositorios/gastos";
import { diasEntre } from "@/lib/fechas";
import { redondearADosDecimales } from "@/lib/numeros";
import type { PanelViaje } from "@/tipos/panel";
import type { GastoDelViaje, Presupuesto } from "@/tipos/resumen";
import type { Viaje } from "@/tipos/viaje";
import { obtenerPresupuesto } from "./presupuestos";
import { compararConPresupuesto, resumirGastos } from "./resumenGastos";

export const CANTIDAD_ULTIMOS_GASTOS = 5;

// Días sobre los que se promedia: con el viaje abierto, los que ya pasaron (si dividiera por todos los días, a mitad de
// viaje el promedio sería engañosamente bajo); con el viaje cerrado, todos (igual que el resumen del cierre).
function diasParaPromedio(viaje: Viaje, hoy: string): number {
  if (viaje.estado === "cerrado" || hoy >= viaje.fechaFin) return diasEntre(viaje.fechaInicio, viaje.fechaFin);
  return hoy <= viaje.fechaInicio ? 1 : diasEntre(viaje.fechaInicio, hoy);
}

// Los números del panel lateral. Cálculo puro (sin base ni API) sobre los mismos cálculos de la consulta del chat: el
// código suma, el modelo no interviene. `gastos` viene del más reciente al más viejo.
export function calcularPanel(
  viaje: Viaje,
  gastos: GastoDelViaje[],
  presupuesto: Presupuesto | null,
  hoy: string,
): PanelViaje {
  const resumen = resumirGastos(gastos);
  const diasPromedio = diasParaPromedio(viaje, hoy);

  return {
    monedaBase: viaje.monedaBase,
    gastado: resumen.total,
    cantidadGastos: resumen.cantidad,
    presupuesto: presupuesto ? compararConPresupuesto(presupuesto, gastos) : null,
    diasPromedio,
    promedioPorDia: redondearADosDecimales(resumen.total / diasPromedio),
    porCategoria: resumen.porCategoria,
    ultimosGastos: gastos.slice(0, CANTIDAD_ULTIMOS_GASTOS),
  };
}

export async function obtenerPanelViaje(viaje: Viaje, hoy: string): Promise<PanelViaje> {
  const gastos = await repositorio.listarGastosDelViaje(viaje.id);
  const presupuesto = await obtenerPresupuesto(viaje);
  return calcularPanel(viaje, gastos, presupuesto, hoy);
}
