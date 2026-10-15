import { sumarMontos } from "@/lib/numeros";
import * as repositorio from "@/repositorios/presupuestos";
import type { Presupuesto } from "@/tipos/resumen";
import type { Viaje } from "@/tipos/viaje";

// Regla única del presupuesto de un viaje: si tiene presupuesto por categoría, el total es la suma de las categorías y
// el presupuesto total que se cargó al crear el viaje se ignora; si no, se usa ese presupuesto total; si tampoco
// hay, el viaje no tiene presupuesto. Recibe el viaje ya validado (el servicio que lo obtuvo comprobó que es del usuario).
export async function obtenerPresupuesto(viaje: Viaje): Promise<Presupuesto | null> {
  const porCategoria = await repositorio.listarPresupuestosPorCategoria(viaje.id);
  if (porCategoria.length > 0) {
    return {
      total: sumarMontos(porCategoria.map((presupuesto) => presupuesto.monto)),
      origen: "categorias",
      porCategoria,
    };
  }

  if (viaje.presupuestoTotal !== null) {
    return { total: viaje.presupuestoTotal, origen: "total", porCategoria: [] };
  }

  return null;
}
