import type { ValorCalificacion } from "@/validaciones/calificaciones";
import { crearClienteSupabase } from "./supabase/clienteServidor";

const VIOLACION_DE_UNICIDAD = "23505";

type ClienteSupabase = Awaited<ReturnType<typeof crearClienteSupabase>>;

// Ninguna consulta filtra por usuario: lo hace el RLS con la sesión que lleva el cliente.
async function actualizarValor(supabase: ClienteSupabase, mensajeId: string, valor: ValorCalificacion) {
  const { data, error } = await supabase
    .from("calificaciones")
    .update({ valor })
    .eq("mensaje_id", mensajeId)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

// No usa upsert: al chocar con una calificación existente intentaría actualizar también mensaje_id, y la base solo
// deja actualizar `valor`. Por eso primero actualiza y, si no había nada, inserta.
export async function guardarCalificacion(mensajeId: string, valor: ValorCalificacion): Promise<void> {
  const supabase = await crearClienteSupabase();
  if (await actualizarValor(supabase, mensajeId, valor)) return;

  const { error } = await supabase.from("calificaciones").insert({ mensaje_id: mensajeId, valor });
  if (!error) return;

  // Dos pedidos simultáneos pudieron insertar a la vez: el perdedor reintenta como actualización.
  if (error.code === VIOLACION_DE_UNICIDAD && (await actualizarValor(supabase, mensajeId, valor))) return;
  throw error;
}

// La calificación de cada mensaje que ya fue calificado (los demás no aparecen en el resultado).
export async function listarCalificaciones(mensajeIds: string[]): Promise<Map<string, ValorCalificacion>> {
  const calificaciones = new Map<string, ValorCalificacion>();
  if (mensajeIds.length === 0) return calificaciones;

  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("calificaciones")
    .select("mensaje_id, valor")
    .in("mensaje_id", mensajeIds);
  if (error) throw error;

  for (const { mensaje_id, valor } of data) {
    if (valor === 1 || valor === -1) calificaciones.set(mensaje_id, valor);
  }
  return calificaciones;
}
