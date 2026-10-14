// Las fechas de un viaje son fechas simples (AAAA-MM-DD): se formatean en UTC para que la zona horaria del
// servidor no las corra un día.
const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function aFecha(fechaIso: string): Date {
  return new Date(`${fechaIso}T00:00:00Z`);
}

export function formatearRangoFechas(inicio: string, fin: string): string {
  return formatoFecha.formatRange(aFecha(inicio), aFecha(fin));
}

export function formatearMonto(monto: number, moneda: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    currencyDisplay: "code",
  }).format(monto);
}

// Una cotización puede ser 1.450,5 o 0,000023: se muestran 6 cifras significativas, no una cantidad fija de decimales.
export function formatearCotizacion(cotizacion: number): string {
  return new Intl.NumberFormat("es-AR", { maximumSignificantDigits: 6 }).format(cotizacion);
}
