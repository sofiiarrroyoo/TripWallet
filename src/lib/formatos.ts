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
