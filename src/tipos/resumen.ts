// Un gasto guardado, con el nombre de su categoría, listo para sumar y mostrar.
export type GastoDelViaje = {
  id: string;
  descripcion: string;
  categoria: string;
  fechaGasto: string;
  montoOriginal: number;
  monedaOriginal: string;
  // Ya en la moneda base del viaje: es lo que se suma.
  montoConvertido: number;
  cotizacion: number;
  fechaCotizacion: string;
  creadoEn: string;
};

export type FiltroGastos = {
  // Nombre exacto de la categoría (ya resuelto contra las existentes).
  categoria?: string;
  // Fechas AAAA-MM-DD, inclusive. Un día es desde = hasta.
  desde?: string;
  hasta?: string;
};

export type TotalPorCategoria = {
  categoria: string;
  total: number;
  cantidad: number;
  porcentajeDelTotal: number;
};

export type TotalPorDia = {
  fecha: string;
  total: number;
  cantidad: number;
};

export type ResumenGastos = {
  total: number;
  cantidad: number;
  porCategoria: TotalPorCategoria[];
  porDia: TotalPorDia[];
};

export type PresupuestoDeCategoria = { categoria: string; monto: number };

export type Presupuesto = {
  total: number;
  // "categorias": el total es la suma de los presupuestos por categoría. "total": es el presupuesto total que se
  // cargó al crear el viaje, sin desglose.
  origen: "categorias" | "total";
  // Vacío cuando el origen es el total.
  porCategoria: PresupuestoDeCategoria[];
};

export type AvanceDeCategoria = {
  categoria: string;
  presupuesto: number;
  gastado: number;
  // Negativo si se pasó del presupuesto.
  restante: number;
  porcentajeGastado: number;
};

export type AvanceDePresupuesto = {
  total: number;
  gastado: number;
  restante: number;
  porcentajeGastado: number;
  porCategoria: AvanceDeCategoria[];
};

// Todo lo que devuelve la consulta de gastos: números ya calculados por el código.
export type ConsultaGastos = {
  monedaBase: string;
  // Los filtros que se aplicaron (la categoría con su nombre exacto).
  filtro: { categoria: string | null; desde: string | null; hasta: string | null };
  // Total, categorías y días de los gastos que cumplen el filtro.
  resumen: ResumenGastos;
  // Los gastos que cumplen el filtro, del más reciente al más viejo, hasta un máximo.
  gastos: GastoDelViaje[];
  hayMasGastos: boolean;
  // Siempre sobre todo el viaje, sin importar el filtro; null si el viaje no tiene presupuesto.
  presupuesto: AvanceDePresupuesto | null;
  // De dónde salen las cotizaciones con las que se convirtieron los gastos en otra moneda.
  fuenteCotizaciones: string;
};
