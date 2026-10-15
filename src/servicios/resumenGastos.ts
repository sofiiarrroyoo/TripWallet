import { redondearADosDecimales, redondearAUnDecimal, sumarMontos } from "@/lib/numeros";
import type {
  AvanceDeCategoria,
  AvanceDePresupuesto,
  FiltroGastos,
  GastoDelViaje,
  Presupuesto,
  ResumenGastos,
  TotalPorCategoria,
  TotalPorDia,
} from "@/tipos/resumen";

// Cálculos puros, sin acceso a la base ni a ninguna API: los totales que ve la persona los saca el código, nunca el
// modelo. Los usan la consulta del chat (US5) y, más adelante, el cierre del viaje (US9).

function porcentaje(parte: number, total: number): number {
  return total > 0 ? redondearAUnDecimal((parte / total) * 100) : 0;
}

export function filtrarGastos(gastos: GastoDelViaje[], { categoria, desde, hasta }: FiltroGastos): GastoDelViaje[] {
  // Las fechas ISO (AAAA-MM-DD) se pueden comparar como texto.
  return gastos.filter(
    (gasto) =>
      (categoria === undefined || gasto.categoria === categoria) &&
      (desde === undefined || gasto.fechaGasto >= desde) &&
      (hasta === undefined || gasto.fechaGasto <= hasta),
  );
}

function agrupar<Clave extends string>(gastos: GastoDelViaje[], clave: (gasto: GastoDelViaje) => Clave) {
  const grupos = new Map<Clave, GastoDelViaje[]>();
  for (const gasto of gastos) {
    const grupo = grupos.get(clave(gasto));
    if (grupo) grupo.push(gasto);
    else grupos.set(clave(gasto), [gasto]);
  }
  return grupos;
}

const totalDe = (gastos: GastoDelViaje[]) => sumarMontos(gastos.map((gasto) => gasto.montoConvertido));

export function resumirGastos(gastos: GastoDelViaje[]): ResumenGastos {
  const total = totalDe(gastos);

  // De la categoría en la que más se gastó a la que menos; a igual monto, por orden alfabético.
  const porCategoria: TotalPorCategoria[] = [...agrupar(gastos, (gasto) => gasto.categoria)]
    .map(([categoria, grupo]) => ({
      categoria,
      total: totalDe(grupo),
      cantidad: grupo.length,
      porcentajeDelTotal: porcentaje(totalDe(grupo), total),
    }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, "es"));

  // En orden cronológico.
  const porDia: TotalPorDia[] = [...agrupar(gastos, (gasto) => gasto.fechaGasto)]
    .map(([fecha, grupo]) => ({ fecha, total: totalDe(grupo), cantidad: grupo.length }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return { total, cantidad: gastos.length, porCategoria, porDia };
}

// Compara contra el presupuesto lo gastado en TODO el viaje (no lo filtrado), porque la pregunta es "cuánto me queda".
// Si el presupuesto es por categorías, el total gastado incluye también las categorías sin presupuesto.
export function compararConPresupuesto(presupuesto: Presupuesto, gastosDelViaje: GastoDelViaje[]): AvanceDePresupuesto {
  const gastado = totalDe(gastosDelViaje);

  const porCategoria: AvanceDeCategoria[] = presupuesto.porCategoria.map(({ categoria, monto }) => {
    const gastadoEnCategoria = totalDe(gastosDelViaje.filter((gasto) => gasto.categoria === categoria));
    return {
      categoria,
      presupuesto: monto,
      gastado: gastadoEnCategoria,
      restante: redondearADosDecimales(monto - gastadoEnCategoria),
      porcentajeGastado: porcentaje(gastadoEnCategoria, monto),
    };
  });

  return {
    total: presupuesto.total,
    gastado,
    restante: redondearADosDecimales(presupuesto.total - gastado),
    porcentajeGastado: porcentaje(gastado, presupuesto.total),
    porCategoria,
  };
}
