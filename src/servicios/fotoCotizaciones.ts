import { ErrorCotizacionNoDisponible } from "@/errores";
import { redondearADiezDecimales } from "@/lib/numeros";
import * as repositorio from "@/repositorios/cotizaciones";
import type { FotoCotizaciones } from "@/tipos/cierre";
import type { CotizacionGuardada } from "@/tipos/cotizacion";
import { obtenerTasasDelDia } from "./cotizaciones";

const MONEDA_DE_LA_FOTO = "USD";

// Pasa una cotización guardada en otra moneda base a dólares: si 1 ARS = 0,0007 USD y 1 ARS = 0,65 CLP, entonces
// 1 USD = 0,65 / 0,0007 CLP. Devuelve null si esa cotización no incluye el dólar y no se puede convertir.
function aBaseUsd(guardada: CotizacionGuardada): FotoCotizaciones | null {
  const unidadesPorUsd = guardada.tasas[MONEDA_DE_LA_FOTO];
  if (unidadesPorUsd === undefined) return null;

  const tasas: Record<string, number> = {};
  for (const [moneda, tasa] of Object.entries(guardada.tasas)) {
    tasas[moneda] = redondearADiezDecimales(tasa / unidadesPorUsd);
  }
  // La moneda base de la cotización guardada vale 1 en su propia base y puede no figurar en la lista.
  tasas[guardada.monedaBase] ??= redondearADiezDecimales(1 / unidadesPorUsd);

  return {
    monedaBase: MONEDA_DE_LA_FOTO,
    fecha: guardada.fecha,
    fuente: guardada.fuente,
    tasas,
    desactualizada: true,
  };
}

// La foto de las cotizaciones del día del cierre, en base USD: es lo que permitiría comparar viajes con la cotización de
// cada uno (la API gratuita no da históricos, así que si no se guarda al cerrar no se puede recuperar). Orden:
// 1) la cotización de hoy en dólares; 2) la última guardada en dólares (con su fecha real y marcada como desactualizada);
// 3) la última guardada en la moneda base del viaje, convertida a dólares; 4) si no hay ninguna, no se puede cerrar.
export async function obtenerFotoCotizaciones(monedaBaseDelViaje: string): Promise<FotoCotizaciones> {
  try {
    const del = await obtenerTasasDelDia(MONEDA_DE_LA_FOTO);
    return {
      monedaBase: MONEDA_DE_LA_FOTO,
      fecha: del.fecha,
      fuente: del.fuente,
      tasas: del.tasas,
      desactualizada: del.desactualizada,
    };
  } catch (error) {
    if (!(error instanceof ErrorCotizacionNoDisponible) || monedaBaseDelViaje === MONEDA_DE_LA_FOTO) throw error;

    const guardada = await repositorio.obtenerUltimaCotizacion(monedaBaseDelViaje);
    const foto = guardada && aBaseUsd(guardada);
    if (!foto) throw error;
    return foto;
  }
}
