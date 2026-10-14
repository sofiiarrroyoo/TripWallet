import type { Json, Tables } from "@/tipos/supabase";
import type { Mensaje, RolMensaje } from "@/tipos/mensaje";
import { type LlamadaTool, esquemaLlamadasTools } from "@/validaciones/mensajes";
import { crearClienteSupabase } from "./supabase/clienteServidor";

const COLUMNAS =
  "id, viaje_id, rol, contenido, llamadas_tools, tokens_entrada, tokens_salida, modelo, creado_en";

type FilaMensaje = Omit<Tables<"mensajes">, "usuario_id">;

export type NuevoMensaje = {
  // Para el mensaje del bot el id lo define el servidor antes de empezar a responder; el del usuario lo genera la base.
  id?: string;
  viajeId: string;
  rol: RolMensaje;
  contenido: string;
  llamadasTools?: LlamadaTool[];
  tokensEntrada?: number | null;
  tokensSalida?: number | null;
  modelo?: string | null;
};

function aRol(rol: string): RolMensaje {
  if (rol === "user" || rol === "assistant") return rol;
  throw new Error(`Rol de mensaje desconocido: ${rol}`);
}

function aMensaje(fila: FilaMensaje): Mensaje {
  return {
    id: fila.id,
    viajeId: fila.viaje_id,
    rol: aRol(fila.rol),
    contenido: fila.contenido,
    llamadasTools: esquemaLlamadasTools.parse(fila.llamadas_tools),
    tokensEntrada: fila.tokens_entrada,
    tokensSalida: fila.tokens_salida,
    modelo: fila.modelo,
    creadoEn: fila.creado_en,
  };
}

// Ninguna consulta filtra por usuario: lo hace el RLS con la sesión que lleva el cliente.
// Devuelve los últimos `limite` mensajes del viaje, del más viejo al más nuevo.
export async function listarUltimosMensajes(viajeId: string, limite: number): Promise<Mensaje[]> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("mensajes")
    .select(COLUMNAS)
    .eq("viaje_id", viajeId)
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data.map(aMensaje).reverse();
}

export async function crearMensaje(mensaje: NuevoMensaje): Promise<Mensaje> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("mensajes")
    .insert({
      id: mensaje.id,
      viaje_id: mensaje.viajeId,
      rol: mensaje.rol,
      contenido: mensaje.contenido,
      llamadas_tools: (mensaje.llamadasTools ?? []) satisfies Json,
      tokens_entrada: mensaje.tokensEntrada ?? null,
      tokens_salida: mensaje.tokensSalida ?? null,
      modelo: mensaje.modelo ?? null,
    })
    .select(COLUMNAS)
    .single();
  if (error) throw error;
  return aMensaje(data);
}

// Para el rate limiting: los mensajes del usuario (en todos sus viajes) desde `desde`, del más viejo al más nuevo.
export async function listarFechasMensajesUsuarioDesde(desde: Date): Promise<Date[]> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("mensajes")
    .select("creado_en")
    .eq("rol", "user")
    .gte("creado_en", desde.toISOString())
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return data.map((fila) => new Date(fila.creado_en));
}
