import type { AvanceDePresupuesto, TotalPorCategoria } from "./resumen";

// Un gasto de los más grandes del viaje, para el resumen.
export type GastoMayor = {
  id: string;
  descripcion: string;
  categoria: string;
  fechaGasto: string;
  montoOriginal: number;
  monedaOriginal: string;
  // En la moneda base del viaje.
  montoConvertido: number;
};

// Lo que se calcula (en TypeScript, no en el modelo) y se guarda al cerrar un viaje.
export type EstadisticasViaje = {
  monedaBase: string;
  total: number;
  cantidadGastos: number;
  // Días entre el inicio y el fin del viaje, ambos incluidos.
  diasDelViaje: number;
  promedioPorDia: number;
  // De la categoría en la que más se gastó a la que menos.
  porCategoria: TotalPorCategoria[];
  gastosMasGrandes: GastoMayor[];
  // Lo planificado contra lo real; null si el viaje no tenía presupuesto.
  presupuesto: AvanceDePresupuesto | null;
};

// Las cotizaciones del día del cierre, en base USD. Es lo que permitiría comparar viajes con la cotización de cada uno.
export type FotoCotizaciones = {
  monedaBase: string;
  // Fecha real de la cotización usada (puede no ser la de hoy).
  fecha: string;
  fuente: string;
  // Unidades de cada moneda por un dólar.
  tasas: Record<string, number>;
  // true si no se pudo consultar la API y se usó la última cotización guardada.
  desactualizada: boolean;
};

// El resumen de un viaje cerrado, tal como se lee de la base.
export type ResumenViaje = {
  viajeId: string;
  estadisticas: EstadisticasViaje;
  cotizacionesCierre: FotoCotizaciones;
  // Texto breve con los puntos más importantes; null si el modelo falló o tardó demasiado.
  resumen: string | null;
  creadoEn: string;
};
