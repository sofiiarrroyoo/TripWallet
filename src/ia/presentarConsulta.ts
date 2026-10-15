import { formatearCotizacion, formatearMonto } from "@/lib/formatos";
import type { ConsultaGastos } from "@/tipos/resumen";

// Lo que ve el modelo después de una consulta de gastos. Los montos van ya escritos ("ARS 21.750,00") para que el modelo
// los copie tal cual: no tiene que formatear, sumar ni calcular nada. Los porcentajes y las cantidades también vienen
// calculados por el código.
export function presentarConsulta(consulta: ConsultaGastos) {
  const { monedaBase, resumen, presupuesto } = consulta;
  const texto = (monto: number) => formatearMonto(monto, monedaBase);

  return {
    monedaBase,
    filtro: consulta.filtro,
    sinGastos: resumen.cantidad === 0,
    total: texto(resumen.total),
    cantidadDeGastos: resumen.cantidad,
    porCategoria: resumen.porCategoria.map((categoria) => ({
      categoria: categoria.categoria,
      total: texto(categoria.total),
      cantidad: categoria.cantidad,
      porcentajeDelTotal: categoria.porcentajeDelTotal,
    })),
    porDia: resumen.porDia.map((dia) => ({ fecha: dia.fecha, total: texto(dia.total), cantidad: dia.cantidad })),
    // Los más recientes primero. Si el gasto fue en otra moneda, trae el monto original y la cotización usada.
    gastos: consulta.gastos.map((gasto) => {
      const enOtraMoneda = gasto.monedaOriginal !== monedaBase;
      return {
        descripcion: gasto.descripcion,
        categoria: gasto.categoria,
        fecha: gasto.fechaGasto,
        monto: texto(gasto.montoConvertido),
        montoOriginal: enOtraMoneda ? formatearMonto(gasto.montoOriginal, gasto.monedaOriginal) : null,
        cotizacion: enOtraMoneda
          ? `1 ${gasto.monedaOriginal} = ${formatearCotizacion(gasto.cotizacion)} ${monedaBase}`
          : null,
        fechaCotizacion: enOtraMoneda ? gasto.fechaCotizacion : null,
      };
    }),
    detalleIncompleto: consulta.hayMasGastos
      ? `Se listan solo los ${consulta.gastos.length} gastos más recientes de ${resumen.cantidad}; los totales incluyen todos.`
      : null,
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
    fuenteCotizaciones: consulta.fuenteCotizaciones,
  };
}
