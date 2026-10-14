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
