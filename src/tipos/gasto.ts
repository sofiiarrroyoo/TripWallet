// Un gasto tal como está guardado.
export type Gasto = {
  id: string;
  viajeId: string;
  montoOriginal: number;
  monedaOriginal: string;
  montoConvertido: number;
  // Unidades de moneda base por una unidad de moneda original.
  cotizacion: number;
  fechaCotizacion: string;
  categoriaId: string;
  descripcion: string;
  fechaGasto: string;
  creadoEn: string;
};

// Todo lo que muestra la tarjeta de confirmación del chat. Se guarda tal cual en mensajes.llamadas_tools, así
// la tarjeta se puede rearmar al volver a entrar al viaje.
export type GastoRegistrado = {
  id: string;
  descripcion: string;
  categoria: string;
  fechaGasto: string;
  montoOriginal: number;
  monedaOriginal: string;
  montoConvertido: number;
  monedaBase: string;
  cotizacion: number;
  fechaCotizacion: string;
  // null cuando la moneda original es la base y no hubo conversión.
  fuente: string | null;
  // Se completa cuando la cotización no es la de hoy.
  aviso: string | null;
};
