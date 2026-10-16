import { diasEntre } from "@/lib/fechas";
import type { Viaje } from "@/tipos/viaje";

export type SituacionViaje = "en_curso" | "proximo" | "terminado" | "cerrado";

// "terminado" es un viaje cuya fecha de fin ya pasó pero todavía no se cerró: es el que hay que cerrar.
export function situacionDelViaje(viaje: Viaje, hoy: string): SituacionViaje {
  if (viaje.estado === "cerrado") return "cerrado";
  if (hoy < viaje.fechaInicio) return "proximo";
  if (hoy > viaje.fechaFin) return "terminado";
  return "en_curso";
}

function textoDias(dias: number): string {
  return dias === 1 ? "1 día" : `${dias} días`;
}

// La línea de tiempo de la tarjeta: dónde estás parado en el viaje o cuánto dura.
export function describirTiempo(viaje: Viaje, hoy: string): string {
  const duracion = diasEntre(viaje.fechaInicio, viaje.fechaFin);
  switch (situacionDelViaje(viaje, hoy)) {
    case "en_curso":
      return `Día ${diasEntre(viaje.fechaInicio, hoy)} de ${duracion}`;
    case "proximo": {
      const faltan = diasEntre(hoy, viaje.fechaInicio) - 1;
      return faltan === 1 ? "Empieza mañana" : `Empieza en ${faltan} días`;
    }
    default:
      return textoDias(duracion);
  }
}

const ORDEN: Record<SituacionViaje, number> = { en_curso: 0, proximo: 1, terminado: 2, cerrado: 3 };

// Primero lo que está pasando o viene: en curso, los próximos (el que empieza antes, primero), los terminados sin cerrar
// y al final los cerrados. Dentro de cada grupo de pasados, el más reciente primero.
export function ordenarViajesParaLista(viajes: Viaje[], hoy: string): Viaje[] {
  const situacion = new Map(viajes.map((viaje) => [viaje.id, situacionDelViaje(viaje, hoy)]));
  const grupo = (viaje: Viaje) => ORDEN[situacion.get(viaje.id) ?? "cerrado"];

  return [...viajes].sort((a, b) => {
    if (grupo(a) !== grupo(b)) return grupo(a) - grupo(b);
    if (grupo(a) === ORDEN.proximo) return a.fechaInicio.localeCompare(b.fechaInicio);
    return b.fechaInicio.localeCompare(a.fechaInicio) || b.creadoEn.localeCompare(a.creadoEn);
  });
}
