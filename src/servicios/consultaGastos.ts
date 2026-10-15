import { FUENTE_COTIZACIONES } from "@/integraciones/apiCotizaciones";
import * as repositorio from "@/repositorios/gastos";
import type { ConsultaGastos } from "@/tipos/resumen";
import { esquemaConsultarGastos } from "@/validaciones/gastos";
import { validar } from "@/validaciones/validar";
import { obtenerCategoriaPorNombre } from "./categorias";
import { obtenerPresupuesto } from "./presupuestos";
import { compararConPresupuesto, filtrarGastos, resumirGastos } from "./resumenGastos";
import { obtenerViaje } from "./viajes";

// Cuántos gastos se listan uno por uno. Los totales siempre incluyen todos; esto solo acota el detalle (y con él lo que
// se le manda al modelo).
export const MAXIMO_GASTOS_EN_DETALLE = 50;

// Responde "¿cuánto llevo gastado?", "¿y en comida?", "¿qué gasté ayer?" y "¿cuánto me queda?". Todo sale de sumar los
// gastos guardados (ya convertidos a la moneda base cuando se registraron): no se consulta ninguna API ni interviene el
// modelo. En un viaje cerrado también se puede consultar.
export async function consultarGastos(viajeId: string, datos: unknown): Promise<ConsultaGastos> {
  const { categoria, desde, hasta } = validar(esquemaConsultarGastos, datos);

  const viaje = await obtenerViaje(viajeId);
  // Se resuelve contra las categorías existentes: "comunicacion" y "Comunicación" son la misma.
  const nombreDeCategoria = categoria === undefined ? undefined : (await obtenerCategoriaPorNombre(categoria)).nombre;

  const gastosDelViaje = await repositorio.listarGastosDelViaje(viaje.id);
  const gastosFiltrados = filtrarGastos(gastosDelViaje, { categoria: nombreDeCategoria, desde, hasta });

  const presupuesto = await obtenerPresupuesto(viaje);

  return {
    monedaBase: viaje.monedaBase,
    filtro: { categoria: nombreDeCategoria ?? null, desde: desde ?? null, hasta: hasta ?? null },
    resumen: resumirGastos(gastosFiltrados),
    // El repositorio ya los trae del más reciente al más viejo.
    gastos: gastosFiltrados.slice(0, MAXIMO_GASTOS_EN_DETALLE),
    hayMasGastos: gastosFiltrados.length > MAXIMO_GASTOS_EN_DETALLE,
    // El presupuesto se compara con TODO lo gastado en el viaje, no con lo filtrado.
    presupuesto: presupuesto ? compararConPresupuesto(presupuesto, gastosDelViaje) : null,
    fuenteCotizaciones: FUENTE_COTIZACIONES,
  };
}
