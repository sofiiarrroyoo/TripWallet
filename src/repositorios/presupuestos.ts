import type { PresupuestoDeCategoria } from "@/tipos/resumen";
import { crearClienteSupabase } from "./supabase/clienteServidor";

// Los presupuestos por categoría de un viaje, con el nombre de cada categoría. El RLS solo deja ver los de viajes propios.
export async function listarPresupuestosPorCategoria(viajeId: string): Promise<PresupuestoDeCategoria[]> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("presupuestos_viaje")
    .select("monto_estimado, categorias(nombre)")
    .eq("viaje_id", viajeId);
  if (error) throw error;

  return data
    .flatMap((fila) => (fila.categorias ? [{ categoria: fila.categorias.nombre, monto: fila.monto_estimado }] : []))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));
}
