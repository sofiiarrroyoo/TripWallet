// Fecha de calendario (AAAA-MM-DD) de un instante en una zona horaria: cerca de la medianoche, la del servidor
// (UTC) ya puede ser otro día que el de la persona.
export function fechaIsoEn(instante: Date, zonaHoraria: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: zonaHoraria,
  }).format(instante);
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Cuántos días tiene un viaje de `inicio` a `fin` (AAAA-MM-DD), contando los dos extremos: del 10 al 12 son 3 días.
// Se calcula en UTC para que el horario de verano no cambie la cuenta.
export function diasEntre(inicio: string, fin: string): number {
  const diferencia = Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`);
  return Math.max(1, Math.round(diferencia / MS_POR_DIA) + 1);
}
