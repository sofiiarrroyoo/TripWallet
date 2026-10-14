export type CotizacionGuardada = {
  monedaBase: string;
  // Fecha de actualización que informa la API, no la de la consulta.
  fecha: string;
  // Unidades de cada moneda por una unidad de monedaBase.
  tasas: Record<string, number>;
  fuente: string;
  obtenidaEn: string;
};
