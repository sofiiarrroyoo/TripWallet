import { describe, expect, it } from "vitest";
import type { Viaje } from "@/tipos/viaje";
import { describirTiempo, ordenarViajesParaLista, situacionDelViaje } from "./estadoViaje";

let contador = 0;

function viaje(fechaInicio: string, fechaFin: string, estado: Viaje["estado"] = "abierto"): Viaje {
  contador += 1;
  return {
    id: `v-${contador}`,
    nombre: `Viaje ${contador}`,
    destino: "Santiago",
    monedaBase: "ARS",
    fechaInicio,
    fechaFin,
    presupuestoTotal: null,
    estado,
    creadoEn: `2026-01-0${contador % 9 || 1}T12:00:00Z`,
  };
}

const HOY = "2026-10-15";

describe("situacionDelViaje", () => {
  it.each([
    ["2026-10-20", "2026-10-30", "abierto", "proximo"],
    ["2026-10-10", "2026-10-20", "abierto", "en_curso"],
    ["2026-10-15", "2026-10-15", "abierto", "en_curso"],
    ["2026-10-01", "2026-10-14", "abierto", "terminado"],
    ["2026-10-01", "2026-10-14", "cerrado", "cerrado"],
    ["2026-10-10", "2026-10-20", "cerrado", "cerrado"],
  ] as const)("del %s al %s (%s) es %s", (inicio, fin, estado, esperada) => {
    expect(situacionDelViaje(viaje(inicio, fin, estado), HOY)).toBe(esperada);
  });
});

describe("describirTiempo", () => {
  it("en curso dice en qué día del viaje estás", () => {
    expect(describirTiempo(viaje("2026-10-12", "2026-10-23"), HOY)).toBe("Día 4 de 12");
  });

  it("un viaje próximo dice cuánto falta", () => {
    expect(describirTiempo(viaje("2026-10-18", "2026-10-25"), HOY)).toBe("Empieza en 3 días");
    expect(describirTiempo(viaje("2026-10-16", "2026-10-25"), HOY)).toBe("Empieza mañana");
  });

  it("un viaje terminado o cerrado dice cuánto duró", () => {
    expect(describirTiempo(viaje("2026-10-01", "2026-10-12"), HOY)).toBe("12 días");
    expect(describirTiempo(viaje("2026-10-01", "2026-10-01", "cerrado"), HOY)).toBe("1 día");
  });
});

describe("ordenarViajesParaLista", () => {
  it("pone primero lo que está en curso, después lo próximo, lo terminado sin cerrar y al final lo cerrado", () => {
    const cerrado = viaje("2026-09-01", "2026-09-10", "cerrado");
    const terminado = viaje("2026-09-20", "2026-10-01");
    const proximo = viaje("2026-11-01", "2026-11-10");
    const enCurso = viaje("2026-10-10", "2026-10-20");

    const ordenados = ordenarViajesParaLista([cerrado, terminado, proximo, enCurso], HOY);

    expect(ordenados).toEqual([enCurso, proximo, terminado, cerrado]);
  });

  it("entre los próximos va primero el que empieza antes", () => {
    const lejano = viaje("2027-01-01", "2027-01-10");
    const cercano = viaje("2026-10-20", "2026-10-25");

    expect(ordenarViajesParaLista([lejano, cercano], HOY)).toEqual([cercano, lejano]);
  });

  it("entre los pasados va primero el más reciente", () => {
    const viejo = viaje("2026-03-01", "2026-03-10", "cerrado");
    const reciente = viaje("2026-08-01", "2026-08-10", "cerrado");

    expect(ordenarViajesParaLista([viejo, reciente], HOY)).toEqual([reciente, viejo]);
  });

  it("no modifica la lista que recibe", () => {
    const lista = [viaje("2026-11-01", "2026-11-10"), viaje("2026-10-10", "2026-10-20")];
    const copia = [...lista];

    ordenarViajesParaLista(lista, HOY);

    expect(lista).toEqual(copia);
  });
});
