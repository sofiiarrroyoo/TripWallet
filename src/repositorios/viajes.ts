import type { Tables } from "@/tipos/supabase";
import type { EstadoViaje, Viaje } from "@/tipos/viaje";
import type { DatosCrearViaje } from "@/validaciones/viajes";
import { crearClienteSupabase } from "./supabase/clienteServidor";

const COLUMNAS = "id, nombre, destino, moneda_base, fecha_inicio, fecha_fin, presupuesto_total, estado, creado_en";

type FilaViaje = Omit<Tables<"viajes">, "usuario_id">;

function aEstado(estado: string): EstadoViaje {
  if (estado === "abierto" || estado === "cerrado") return estado;
  throw new Error(`Estado de viaje desconocido: ${estado}`);
}

function aViaje(fila: FilaViaje): Viaje {
  return {
    id: fila.id,
    nombre: fila.nombre,
    destino: fila.destino,
    monedaBase: fila.moneda_base,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    presupuestoTotal: fila.presupuesto_total,
    estado: aEstado(fila.estado),
    creadoEn: fila.creado_en,
  };
}

// Ninguna consulta filtra por usuario: lo hace el RLS con la sesión que lleva el cliente.
export async function listarViajes(): Promise<Viaje[]> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("viajes")
    .select(COLUMNAS)
    .order("fecha_inicio", { ascending: false })
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return data.map(aViaje);
}

export async function obtenerViaje(id: string): Promise<Viaje | null> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase.from("viajes").select(COLUMNAS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? aViaje(data) : null;
}

export async function crearViaje(viaje: DatosCrearViaje): Promise<Viaje> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("viajes")
    .insert({
      nombre: viaje.nombre,
      destino: viaje.destino,
      moneda_base: viaje.monedaBase,
      fecha_inicio: viaje.fechaInicio,
      fecha_fin: viaje.fechaFin,
      presupuesto_total: viaje.presupuestoTotal,
    })
    .select(COLUMNAS)
    .single();
  if (error) throw error;
  return aViaje(data);
}
