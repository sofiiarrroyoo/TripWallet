import { z } from "zod";
import type { EstadisticasViaje, FotoCotizaciones } from "@/tipos/cierre";
import { esquemaTasas } from "./cotizaciones";

const monto = z.number();
const porcentaje = z.number();

const esquemaAvanceDeCategoria = z.object({
  categoria: z.string(),
  presupuesto: monto,
  gastado: monto,
  restante: monto,
  porcentajeGastado: porcentaje,
});

const esquemaAvanceDePresupuesto = z.object({
  total: monto,
  gastado: monto,
  restante: monto,
  porcentajeGastado: porcentaje,
  porCategoria: z.array(esquemaAvanceDeCategoria),
});

// Lo que está guardado en resumenes_viaje.estadisticas. Se lee con este esquema en vez de confiar en el JSON: si el
// formato cambiara, un resumen viejo no tiene que romper la pantalla.
export const esquemaEstadisticasViaje: z.ZodType<EstadisticasViaje> = z.object({
  monedaBase: z.string(),
  total: monto,
  cantidadGastos: z.number().int(),
  diasDelViaje: z.number().int(),
  promedioPorDia: monto,
  porCategoria: z.array(
    z.object({ categoria: z.string(), total: monto, cantidad: z.number().int(), porcentajeDelTotal: porcentaje }),
  ),
  gastosMasGrandes: z.array(
    z.object({
      id: z.string(),
      descripcion: z.string(),
      categoria: z.string(),
      fechaGasto: z.string(),
      montoOriginal: monto,
      monedaOriginal: z.string(),
      montoConvertido: monto,
    }),
  ),
  presupuesto: esquemaAvanceDePresupuesto.nullable(),
});

export const esquemaFotoCotizaciones: z.ZodType<FotoCotizaciones> = z.object({
  monedaBase: z.string(),
  fecha: z.string(),
  fuente: z.string(),
  tasas: esquemaTasas,
  desactualizada: z.boolean(),
});
