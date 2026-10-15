import {
  ErrorGastosModificados,
  ErrorNoEncontrado,
  ErrorViajeAbierto,
  ErrorViajeCerrado,
  ErrorViajeSinGastos,
} from "@/errores";
import type { EstadisticasViaje, FotoCotizaciones, ResumenViaje } from "@/tipos/cierre";
import type { Json } from "@/tipos/supabase";
import { esquemaEstadisticasViaje, esquemaFotoCotizaciones } from "@/validaciones/resumenViaje";
import { crearClienteSupabase } from "./supabase/clienteServidor";

export type DatosCierre = {
  viajeId: string;
  // Los gastos que se usaron para calcular las estadísticas: la base comprueba que sigan siendo todos los del viaje.
  gastosIds: string[];
  estadisticas: EstadisticasViaje;
  cotizacionesCierre: FotoCotizaciones;
  // null si el modelo falló o tardó demasiado: el viaje se cierra igual.
  resumen: string | null;
};

// Las funciones de Postgres avisan con un código dentro del mensaje de la excepción.
function traducir(error: { message: string }): Error {
  if (error.message.includes("VIAJE_NO_ENCONTRADO")) return new ErrorNoEncontrado("VIAJE");
  if (error.message.includes("VIAJE_CERRADO")) return new ErrorViajeCerrado();
  if (error.message.includes("VIAJE_ABIERTO")) return new ErrorViajeAbierto();
  if (error.message.includes("VIAJE_SIN_GASTOS")) return new ErrorViajeSinGastos();
  if (error.message.includes("GASTOS_MODIFICADOS")) return new ErrorGastosModificados();
  return error as Error;
}

// Cambiar el estado del viaje y guardar su resumen es una transacción: lo hace una función de Postgres (como un
// método @Transactional) y no dos llamadas sueltas. La función verifica que el viaje sea de la persona.
export async function cerrarViaje(cierre: DatosCierre): Promise<void> {
  const supabase = await crearClienteSupabase();
  const { error } = await supabase.rpc("cerrar_viaje", {
    p_viaje_id: cierre.viajeId,
    p_gastos_ids: cierre.gastosIds,
    p_estadisticas: cierre.estadisticas satisfies Json,
    p_cotizaciones_cierre: cierre.cotizacionesCierre satisfies Json,
    // La función acepta null (resumen sin generar), pero el tipo generado del argumento no lo refleja.
    p_resumen: cierre.resumen as string,
  });
  if (error) throw traducir(error);
}

// Al reabrir se borra el resumen: solo existe mientras el viaje está cerrado.
export async function reabrirViaje(viajeId: string): Promise<void> {
  const supabase = await crearClienteSupabase();
  const { error } = await supabase.rpc("reabrir_viaje", { p_viaje_id: viajeId });
  if (error) throw traducir(error);
}

// Ninguna consulta filtra por usuario: lo hace el RLS (solo se ve el resumen de los viajes propios).
export async function obtenerResumen(viajeId: string): Promise<ResumenViaje | null> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("resumenes_viaje")
    .select("viaje_id, estadisticas, cotizaciones_cierre, resumen, creado_en")
    .eq("viaje_id", viajeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    viajeId: data.viaje_id,
    estadisticas: esquemaEstadisticasViaje.parse(data.estadisticas),
    cotizacionesCierre: esquemaFotoCotizaciones.parse(data.cotizaciones_cierre),
    resumen: data.resumen,
    creadoEn: data.creado_en,
  };
}
