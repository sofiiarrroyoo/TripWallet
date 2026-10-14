import type { Tables } from "@/tipos/supabase";
import type { CotizacionGuardada } from "@/tipos/cotizacion";
import { esquemaTasas } from "@/validaciones/cotizaciones";
import { crearClienteSupabase } from "./supabase/clienteServidor";

const COLUMNAS = "moneda_base, fecha, tasas, fuente, obtenida_en";
const VIOLACION_DE_UNICIDAD = "23505";

type FilaCotizacion = Pick<Tables<"cotizaciones">, "moneda_base" | "fecha" | "tasas" | "fuente" | "obtenida_en">;

function aCotizacion(fila: FilaCotizacion): CotizacionGuardada {
  return {
    monedaBase: fila.moneda_base,
    fecha: fila.fecha,
    tasas: esquemaTasas.parse(fila.tasas),
    fuente: fila.fuente,
    obtenidaEn: fila.obtenida_en,
  };
}

// La caché es por usuario: el RLS solo deja ver las cotizaciones propias, así que no se filtra por usuario acá.
export async function obtenerUltimaCotizacion(monedaBase: string): Promise<CotizacionGuardada | null> {
  const supabase = await crearClienteSupabase();
  const { data, error } = await supabase
    .from("cotizaciones")
    .select(COLUMNAS)
    .eq("moneda_base", monedaBase)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? aCotizacion(data) : null;
}

export async function guardarCotizacion(cotizacion: Omit<CotizacionGuardada, "obtenidaEn">): Promise<void> {
  const supabase = await crearClienteSupabase();
  const { error } = await supabase.from("cotizaciones").insert({
    moneda_base: cotizacion.monedaBase,
    fecha: cotizacion.fecha,
    tasas: cotizacion.tasas,
    fuente: cotizacion.fuente,
  });
  // Un pedido simultáneo del mismo usuario ya guardó la cotización de esa fecha: no hay nada que hacer.
  if (error && error.code !== VIOLACION_DE_UNICIDAD) throw error;
}
