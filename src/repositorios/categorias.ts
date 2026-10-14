import { ErrorCategoriaDuplicada } from "@/errores";
import type { Categoria } from "@/tipos/categoria";
import type { Tables } from "@/tipos/supabase";
import { crearClienteSupabase } from "./supabase/clienteServidor";

const COLUMNAS = "id, usuario_id, nombre";
const VIOLACION_DE_UNICIDAD = "23505";

type FilaCategoria = Pick<Tables<"categorias">, "id" | "usuario_id" | "nombre">;

function aCategoria(fila: FilaCategoria): Categoria {
  return { id: fila.id, nombre: fila.nombre, esPorDefecto: fila.usuario_id === null };
}

// El RLS devuelve las categorías por defecto y las propias del usuario, y nada más.
// Primero las que vienen con la app y después las propias, cada grupo en el orden en que se crearon.
export async function listarCategorias(): Promise<Categoria[]> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("categorias")
    .select(COLUMNAS)
    .order("usuario_id", { ascending: true, nullsFirst: true })
    .order("creado_en", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data.map(aCategoria);
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase.from("categorias").insert({ nombre }).select(COLUMNAS).single();
  // El índice único de la base (por usuario, sin distinguir mayúsculas) atrapa lo que el servicio no vio,
  // por ejemplo dos pedidos simultáneos con el mismo nombre.
  if (error?.code === VIOLACION_DE_UNICIDAD) throw new ErrorCategoriaDuplicada(nombre);
  if (error) throw error;
  return aCategoria(data);
}
