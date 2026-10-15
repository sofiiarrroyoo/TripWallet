import { formatearCotizacion, formatearMonto, formatearRangoFechas } from "@/lib/formatos";
import type { EstadisticasViaje } from "@/tipos/cierre";
import type { Viaje } from "@/tipos/viaje";
import type { ResumenCierre } from "@/validaciones/resumenCierre";

export const INSTRUCCIONES_RESUMEN = [
  "Sos el asistente de TripWallet, una app de gastos de viaje. Te paso las estadísticas de un viaje que la persona acaba de cerrar y tenés que escribir un resumen breve.",
  "Reglas:",
  "- Escribí en español rioplatense, con voseo y tono cercano, sin Markdown ni emojis.",
  "- Usá SOLO los números del bloque de datos, copiados tal como vienen escritos. No sumes, no restes, no calcules porcentajes ni promedios, no redondees: ya están calculados.",
  "- No inventes datos que no estén en el bloque (lugares, personas, motivos de un gasto).",
  "- Mencioná lo más importante: cuánto se gastó en total, en qué categoría se fue más plata y algún gasto grande. Si hay presupuesto, decí si se cumplió o se pasó, y por cuánto.",
  "- El titular es una sola frase. Los puntos son entre 2 y 4, cortos y con un dato concreto cada uno.",
  "",
  "Ejemplo de salida:",
  '{"titular":"Gastaste ARS 53.000,00 en 10 días, dentro del presupuesto.","puntos":["Lo que más pesó fue Comida y bebida, con ARS 25.000,00 (47,2% del total).","El gasto más grande fue la cena, de ARS 21.750,00.","Te quedaron ARS 47.000,00 del presupuesto."]}',
].join("\n");

// Lo que ve el modelo: las estadísticas con los montos ya escritos ("ARS 21.750,00"), para que los copie tal cual.
export function presentarEstadisticas(viaje: Viaje, estadisticas: EstadisticasViaje) {
  const texto = (monto: number) => formatearMonto(monto, estadisticas.monedaBase);
  const { presupuesto } = estadisticas;

  return {
    viaje: {
      nombre: viaje.nombre,
      destino: viaje.destino,
      fechas: formatearRangoFechas(viaje.fechaInicio, viaje.fechaFin),
      diasDelViaje: estadisticas.diasDelViaje,
    },
    monedaBase: estadisticas.monedaBase,
    total: texto(estadisticas.total),
    cantidadDeGastos: estadisticas.cantidadGastos,
    promedioPorDia: texto(estadisticas.promedioPorDia),
    porCategoria: estadisticas.porCategoria.map((categoria) => ({
      categoria: categoria.categoria,
      total: texto(categoria.total),
      cantidad: categoria.cantidad,
      porcentajeDelTotal: categoria.porcentajeDelTotal,
    })),
    gastosMasGrandes: estadisticas.gastosMasGrandes.map((gasto) => {
      const enOtraMoneda = gasto.monedaOriginal !== estadisticas.monedaBase;
      return {
        descripcion: gasto.descripcion,
        categoria: gasto.categoria,
        fecha: gasto.fechaGasto,
        monto: texto(gasto.montoConvertido),
        montoOriginal: enOtraMoneda ? formatearMonto(gasto.montoOriginal, gasto.monedaOriginal) : null,
        cotizacion: enOtraMoneda
          ? `1 ${gasto.monedaOriginal} = ${formatearCotizacion(gasto.montoConvertido / gasto.montoOriginal)} ${estadisticas.monedaBase}`
          : null,
      };
    }),
    presupuesto: presupuesto && {
      total: texto(presupuesto.total),
      gastado: texto(presupuesto.gastado),
      // Negativo si se pasó (por ejemplo "-ARS 13.000,00").
      restante: texto(presupuesto.restante),
      porcentajeGastado: presupuesto.porcentajeGastado,
      seExcedio: presupuesto.restante < 0,
      porCategoria: presupuesto.porCategoria.map((categoria) => ({
        categoria: categoria.categoria,
        presupuesto: texto(categoria.presupuesto),
        gastado: texto(categoria.gastado),
        restante: texto(categoria.restante),
        porcentajeGastado: categoria.porcentajeGastado,
        seExcedio: categoria.restante < 0,
      })),
    },
  };
}

// El texto que se guarda en resumenes_viaje.resumen: el titular y, debajo, los puntos con un guion.
export function textoDeResumen({ titular, puntos }: ResumenCierre): string {
  return [titular, "", ...puntos.map((punto) => `- ${punto}`)].join("\n");
}
