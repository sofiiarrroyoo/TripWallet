import { formatearCotizacion, formatearMonto, formatearRangoFechas } from "@/lib/formatos";
import type { GastoRegistrado } from "@/tipos/gasto";

export type ResumenDeGasto = {
  titulo: string;
  detalle: string;
  montoPrincipal: string;
  // Los tres siguientes son null cuando la moneda del gasto es la del viaje y no hubo conversión.
  montoOriginal: string | null;
  cotizacion: string | null;
  fuente: string | null;
  aviso: string | null;
};

function formatearFecha(fechaIso: string): string {
  return formatearRangoFechas(fechaIso, fechaIso);
}

// Todo lo que muestra la tarjeta del gasto, ya formateado: así el componente solo dibuja.
export function resumenDeGasto(gasto: GastoRegistrado): ResumenDeGasto {
  const huboConversion = gasto.monedaOriginal !== gasto.monedaBase;

  return {
    titulo: gasto.descripcion,
    detalle: `${gasto.categoria} · ${formatearFecha(gasto.fechaGasto)}`,
    montoPrincipal: formatearMonto(gasto.montoConvertido, gasto.monedaBase),
    montoOriginal: huboConversion ? formatearMonto(gasto.montoOriginal, gasto.monedaOriginal) : null,
    cotizacion: huboConversion
      ? `1 ${gasto.monedaOriginal} = ${formatearCotizacion(gasto.cotizacion)} ${gasto.monedaBase} · cotización del ${formatearFecha(gasto.fechaCotizacion)}`
      : null,
    fuente: huboConversion ? gasto.fuente : null,
    aviso: gasto.aviso,
  };
}
