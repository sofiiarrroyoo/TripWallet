import { ErrorViajeCerrado } from "@/errores";
import type { Gasto } from "@/tipos/gasto";
import type { GastoDelViaje } from "@/tipos/resumen";
import type { Tables } from "@/tipos/supabase";
import { crearClienteSupabase } from "./supabase/clienteServidor";

const COLUMNAS =
  "id, viaje_id, monto_original, moneda_original, monto_convertido, cotizacion, fecha_cotizacion, categoria_id, descripcion, fecha_gasto, creado_en";

// El trigger de la base lanza este código en el mensaje cuando se intenta tocar un gasto de un viaje cerrado.
const VIAJE_CERRADO = "VIAJE_CERRADO";

type FilaGasto = Omit<Tables<"gastos">, "usuario_id">;

export type NuevoGasto = {
  viajeId: string;
  montoOriginal: number;
  monedaOriginal: string;
  montoConvertido: number;
  cotizacion: number;
  fechaCotizacion: string;
  categoriaId: string;
  descripcion: string;
  fechaGasto: string;
};

function aGasto(fila: FilaGasto): Gasto {
  return {
    id: fila.id,
    viajeId: fila.viaje_id,
    montoOriginal: fila.monto_original,
    monedaOriginal: fila.moneda_original,
    montoConvertido: fila.monto_convertido,
    cotizacion: fila.cotizacion,
    fechaCotizacion: fila.fecha_cotizacion,
    categoriaId: fila.categoria_id,
    descripcion: fila.descripcion,
    fechaGasto: fila.fecha_gasto,
    creadoEn: fila.creado_en,
  };
}

function traducir(error: { message: string }): Error {
  return error.message.includes(VIAJE_CERRADO) ? new ErrorViajeCerrado() : (error as Error);
}

// Ninguna consulta filtra por usuario: lo hace el RLS con la sesión que lleva el cliente.
export async function crearGasto(gasto: NuevoGasto): Promise<Gasto> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("gastos")
    .insert({
      viaje_id: gasto.viajeId,
      monto_original: gasto.montoOriginal,
      moneda_original: gasto.monedaOriginal,
      monto_convertido: gasto.montoConvertido,
      cotizacion: gasto.cotizacion,
      fecha_cotizacion: gasto.fechaCotizacion,
      categoria_id: gasto.categoriaId,
      descripcion: gasto.descripcion,
      fecha_gasto: gasto.fechaGasto,
    })
    .select(COLUMNAS)
    .single();
  if (error) throw traducir(error);
  return aGasto(data);
}

// El gasto cargado más recientemente en el viaje (el que corresponde a "borrá el último"), o null si no hay.
export async function obtenerUltimoGasto(viajeId: string): Promise<Gasto | null> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("gastos")
    .select(COLUMNAS)
    .eq("viaje_id", viajeId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? aGasto(data) : null;
}

const COLUMNAS_CON_CATEGORIA =
  "id, descripcion, fecha_gasto, monto_original, moneda_original, monto_convertido, cotizacion, fecha_cotizacion, creado_en, categorias(nombre)";

// Supabase devuelve como máximo 1000 filas por consulta: se pide de a páginas para que los totales no queden
// incompletos sin que nadie se entere.
export const TAMANO_PAGINA_GASTOS = 1000;

// Un gasto sin categoría legible no se descarta: dejarlo afuera cambiaría los totales.
const CATEGORIA_DESCONOCIDA = "Sin categoría";

type FilaConCategoria = Pick<
  Tables<"gastos">,
  | "id"
  | "descripcion"
  | "fecha_gasto"
  | "monto_original"
  | "moneda_original"
  | "monto_convertido"
  | "cotizacion"
  | "fecha_cotizacion"
  | "creado_en"
> & { categorias: { nombre: string } | null };

function aGastoDelViaje(fila: FilaConCategoria): GastoDelViaje {
  return {
    id: fila.id,
    descripcion: fila.descripcion,
    categoria: fila.categorias?.nombre ?? CATEGORIA_DESCONOCIDA,
    fechaGasto: fila.fecha_gasto,
    montoOriginal: fila.monto_original,
    monedaOriginal: fila.moneda_original,
    montoConvertido: fila.monto_convertido,
    cotizacion: fila.cotizacion,
    fechaCotizacion: fila.fecha_cotizacion,
    creadoEn: fila.creado_en,
  };
}

// Todos los gastos del viaje, del más reciente al más viejo, con el nombre de su categoría.
// El RLS solo deja ver los propios, así que no se filtra por usuario.
export async function listarGastosDelViaje(viajeId: string): Promise<GastoDelViaje[]> {
  const supabase = await crearClienteSupabase();
  const gastos: GastoDelViaje[] = [];

  for (let desde = 0; ; desde += TAMANO_PAGINA_GASTOS) {
    const { data, error } = await supabase
      .from("gastos")
      .select(COLUMNAS_CON_CATEGORIA)
      .eq("viaje_id", viajeId)
      // El id desempata: sin un orden total, una página podría repetir o saltearse gastos.
      .order("fecha_gasto", { ascending: false })
      .order("creado_en", { ascending: false })
      .order("id", { ascending: true })
      .range(desde, desde + TAMANO_PAGINA_GASTOS - 1);
    if (error) throw error;

    gastos.push(...data.map(aGastoDelViaje));
    if (data.length < TAMANO_PAGINA_GASTOS) return gastos;
  }
}

// Cuáles de estos gastos siguen existiendo en el viaje (el RLS esconde los ajenos).
export async function listarIdsExistentes(viajeId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase.from("gastos").select("id").eq("viaje_id", viajeId).in("id", ids);
  if (error) throw error;
  return data.map((fila) => fila.id);
}

// Devuelve false si no había ningún gasto con ese id en ese viaje (o no es del usuario): el RLS no deja ver los ajenos.
export async function eliminarGasto(viajeId: string, gastoId: string): Promise<boolean> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("gastos")
    .delete()
    .eq("id", gastoId)
    .eq("viaje_id", viajeId)
    .select("id");
  if (error) throw traducir(error);
  return data.length > 0;
}
